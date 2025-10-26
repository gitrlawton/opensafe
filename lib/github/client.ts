/**
 * GitHub API Client
 * Fetches repository data for security scanning
 */

import type {
  GitHubRepoMetadata,
  GitHubFile,
  FileToScan,
  ParsedGitHubUrl,
  GitHubTreeItem,
  PackageJson,
} from "@/types/github";

export class GitHubClient {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Parse GitHub URL to extract owner and repo name
   */
  parseRepoUrl(url: string): ParsedGitHubUrl {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ""),
    };
  }

  /**
   * Fetch repository metadata
   */
  async getRepoMetadata(
    owner: string,
    repo: string,
    onProgress?: (message: string) => void
  ): Promise<GitHubRepoMetadata> {
    onProgress?.(`📡 Fetching repository info...`);

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch repo metadata: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      owner: data.owner.login,
      name: data.name,
      defaultBranch: data.default_branch || "main",
      language: data.language || "Unknown",
      description: data.description || undefined,
      stars: data.stargazers_count || 0,
      lastPushedAt: data.pushed_at || undefined,
    };
  }

  /**
   * Fetch repository tree (list of all files)
   */
  async getRepoTree(
    owner: string,
    repo: string,
    branch: string,
    onProgress?: (message: string) => void
  ): Promise<GitHubTreeItem[]> {
    onProgress?.(`🌳 Fetching repository file tree...`);

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch repo tree: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    onProgress?.(`✅ Found ${data.tree.length} files in repository`);

    return data.tree;
  }

  /**
   * Fetch package.json content
   */
  async getPackageJson(
    owner: string,
    repo: string,
    branch: string,
    onProgress?: (message: string) => void
  ): Promise<PackageJson | null> {
    onProgress?.(`📦 Fetching package.json...`);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${branch}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        onProgress?.(`⚠️  package.json not found`);
        return null;
      }

      const data = await response.json();
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      onProgress?.(`✅ package.json loaded`);

      return JSON.parse(content);
    } catch (error) {
      onProgress?.(`⚠️  Failed to load package.json`);
      return null;
    }
  }

  /**
   * Fetch file content
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string,
    onProgress?: (message: string) => void
  ): Promise<string | null> {
    onProgress?.(`📄 Fetching ${path}...`);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        onProgress?.(`⚠️  Failed to fetch ${path}`);
        return null;
      }

      const data = await response.json();

      // Check if file is too large
      if (data.size > 1000000) {
        // 1MB limit
        onProgress?.(
          `⚠️  Skipping ${path} (file too large: ${data.size} bytes)`
        );
        return null;
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      onProgress?.(`✅ Loaded ${path} (${data.size} bytes)`);

      return content;
    } catch (error) {
      onProgress?.(`⚠️  Error fetching ${path}`);
      return null;
    }
  }

  /**
   * Get install scripts from package.json
   */
  getInstallScripts(packageJson: PackageJson | null): string[] {
    if (!packageJson?.scripts) return [];

    const scripts = packageJson.scripts;
    const installScriptKeys = [
      "preinstall",
      "install",
      "postinstall",
      "prepare",
      "prepublish",
      "prepublishOnly",
    ];

    return installScriptKeys
      .filter((key) => scripts[key])
      .map((key) => `${key}: ${scripts[key]}`);
  }

  /**
   * Find executable files in tree
   */
  findExecutableFiles(tree: GitHubTreeItem[]): string[] {
    const executableExtensions = [
      ".exe",
      ".sh",
      ".bat",
      ".bin",
      ".cmd",
      ".ps1",
    ];

    return tree
      .filter((item: GitHubTreeItem) => {
        if (item.type !== "blob") return false;
        return executableExtensions.some((ext) => item.path.endsWith(ext));
      })
      .map((item: GitHubTreeItem) => item.path);
  }

  /**
   * Find files that should be scanned for security issues
   * Returns all security-relevant files with priority ordering
   */
  findFilesToScan(tree: GitHubTreeItem[]): FileToScan[] {
    const files: FileToScan[] = [];

    // Priority 1 (Critical) - Configuration and credential files
    const criticalPatterns = [
      /^package\.json$/i,
      /^\.env/i,
      /credentials/i,
      /secrets/i,
      /^\.npmrc$/i,
      /^\.yarnrc$/i,
      /password/i,
      /private.*key/i,
    ];

    // Priority 2 (High) - Install/build scripts that execute during npm install
    const highPriorityPatterns = [
      /postinstall\.(js|ts|sh)$/i,
      /preinstall\.(js|ts|sh)$/i,
      /install\.(js|ts|sh)$/i,
      /^scripts\/(install|postinstall|preinstall)/i,
      /^bin\//i,
    ];

    // Priority 3 (Medium) - All JavaScript/TypeScript files in key directories
    const mediumPriorityPatterns = [
      /^scripts\/.*\.(js|ts)$/i,
      /^build\/.*\.(js|ts)$/i,
      /^tools\/.*\.(js|ts)$/i,
      /^\.github\/workflows\//i,
    ];

    // Priority 4 (Low) - Executable files and other scripts
    const lowPriorityPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.sh$/i,
      /\.ps1$/i,
      /config\.json$/i,
    ];

    tree.forEach((item: GitHubTreeItem) => {
      if (item.type !== "blob") return;

      const path = item.path;
      let priority: 1 | 2 | 3 | 4 | 5 = 5; // Default low priority

      if (criticalPatterns.some((pattern) => pattern.test(path))) {
        priority = 1;
      } else if (highPriorityPatterns.some((pattern) => pattern.test(path))) {
        priority = 2;
      } else if (mediumPriorityPatterns.some((pattern) => pattern.test(path))) {
        priority = 3;
      } else if (lowPriorityPatterns.some((pattern) => pattern.test(path))) {
        priority = 4;
      } else {
        return; // Skip files that don't match any pattern
      }

      files.push({ path, priority });
    });

    // Sort by priority (1 = highest priority)
    files.sort((a, b) => a.priority - b.priority);

    return files;
  }

  /**
   * Scan multiple files and call progress callback for each
   */
  async scanFiles(
    owner: string,
    repo: string,
    branch: string,
    files: FileToScan[],
    onProgress?: (message: string, current: number, total: number) => void
  ): Promise<Map<string, string | null>> {
    const scannedFiles = new Map<string, string | null>();

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i].path;

      onProgress?.(
        `📥 Fetching (${i + 1}/${files.length}): ${filePath}`,
        i + 1,
        files.length
      );

      // Skip large lock files - we only need package.json for dependencies
      if (
        filePath.includes("package-lock.json") ||
        filePath.includes("yarn.lock") ||
        filePath.includes("pnpm-lock.yaml")
      ) {
        scannedFiles.set(filePath, "[Skipped - lock file]");
        continue;
      }

      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
          { headers: this.headers }
        );

        if (!response.ok) {
          scannedFiles.set(filePath, null);
          continue;
        }

        const data = await response.json();

        // Skip files larger than 100KB (much more aggressive limit)
        if (data.size > 100000) {
          scannedFiles.set(
            filePath,
            `[Skipped - file too large: ${data.size} bytes]`
          );
          continue;
        }

        let content = Buffer.from(data.content, "base64").toString("utf-8");

        scannedFiles.set(filePath, content);
      } catch (error) {
        scannedFiles.set(filePath, null);
      }
    }

    return scannedFiles;
  }
}
