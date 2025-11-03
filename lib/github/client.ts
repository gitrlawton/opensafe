/**
 * GitHub API Client
 *
 * This module provides methods for fetching repository data from GitHub's REST API.
 * Used to retrieve file contents, repository metadata, and directory structures
 * for security scanning purposes.
 *
 * Key Features:
 * - Repository metadata retrieval (stars, language, last push date)
 * - File tree traversal with recursive directory support
 * - Intelligent file prioritization for security scanning
 * - Content fetching with size limits to manage API quotas
 * - Install script extraction from package.json
 * - Executable file detection
 *
 * API Rate Limits:
 * - Authenticated: 5,000 requests/hour
 * - Unauthenticated: 60 requests/hour
 * - Recommended: Always use authentication token for higher limits
 *
 * @module lib/github/client
 */

import type {
  GitHubRepoMetadata,
  FileToScan,
  ParsedGitHubUrl,
  GitHubTreeItem,
  PackageJson,
} from '@/types/github';

/**
 * Client for interacting with GitHub's REST API
 *
 * Provides methods to fetch repository data needed for security analysis.
 * Handles authentication, error recovery, and file size limits.
 *
 * @class GitHubClient
 *
 * @example
 * ```typescript
 * const client = new GitHubClient(process.env.GITHUB_TOKEN);
 *
 * const metadata = await client.getRepoMetadata('facebook', 'react');
 * const tree = await client.getRepoTree('facebook', 'react', 'main');
 * const filesToScan = client.findFilesToScan(tree);
 * ```
 */
export class GitHubClient {
  private token?: string;

  /**
   * Creates a new GitHub API client
   *
   * @param token - Optional GitHub personal access token for authentication
   *                Significantly increases rate limits (5000/hr vs 60/hr)
   */
  constructor(token?: string) {
    this.token = token;
  }

  /**
   * Generates HTTP headers for GitHub API requests
   *
   * Includes authentication token if provided, otherwise makes unauthenticated requests.
   *
   * @returns Object containing Accept and optional Authorization headers
   */
  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Parses a GitHub URL to extract owner and repository name
   *
   * Supports various GitHub URL formats including .git suffix.
   *
   * @param url - GitHub repository URL
   * @returns Object containing owner and repo name (with .git suffix removed)
   * @throws {Error} If URL format is invalid or not a GitHub URL
   *
   * @example
   * ```typescript
   * const parsed = client.parseRepoUrl('https://github.com/facebook/react');
   * // => { owner: 'facebook', repo: 'react' }
   *
   * const parsed2 = client.parseRepoUrl('github.com/facebook/react.git');
   * // => { owner: 'facebook', repo: 'react' }
   * ```
   */
  parseRepoUrl(url: string): ParsedGitHubUrl {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  /**
   * Fetches repository metadata from GitHub API
   *
   * Retrieves essential information about a repository including name, language,
   * star count, default branch, and last push timestamp.
   *
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @param onProgress - Optional callback for progress messages
   * @returns Promise resolving to repository metadata
   * @throws {Error} If repository not found or API request fails
   *
   * @example
   * ```typescript
   * const metadata = await client.getRepoMetadata('facebook', 'react', console.log);
   * console.log(metadata.stars); // e.g., 200000
   * console.log(metadata.language); // e.g., "JavaScript"
   * console.log(metadata.lastPushedAt); // ISO timestamp
   * ```
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
      defaultBranch: data.default_branch || 'main',
      language: data.language || 'Unknown',
      description: data.description || undefined,
      stars: data.stargazers_count || 0,
      lastPushedAt: data.pushed_at || undefined,
    };
  }

  /**
   * Fetches the complete file tree for a repository
   *
   * Retrieves a recursive list of all files and directories in the repository.
   * Uses GitHub's tree API with recursive=1 for efficient single-request retrieval.
   *
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @param branch - Branch name to fetch tree from
   * @param onProgress - Optional callback for progress messages
   * @returns Promise resolving to array of tree items (files and directories)
   * @throws {Error} If branch not found or API request fails
   *
   * @example
   * ```typescript
   * const tree = await client.getRepoTree('facebook', 'react', 'main');
   * console.log(tree.length); // Total number of files
   * const files = tree.filter(item => item.type === 'blob');
   * ```
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
   * Fetches and parses the package.json file from a repository
   *
   * Retrieves the package.json file (if present) and parses it as JSON.
   * Returns null if file doesn't exist or parsing fails.
   *
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @param branch - Branch name to fetch from
   * @param onProgress - Optional callback for progress messages
   * @returns Promise resolving to parsed package.json or null if not found
   *
   * @example
   * ```typescript
   * const pkg = await client.getPackageJson('facebook', 'react', 'main');
   * if (pkg) {
   *   console.log(pkg.dependencies);
   *   console.log(pkg.scripts?.postinstall);
   * }
   * ```
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
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      onProgress?.(`✅ package.json loaded`);

      return JSON.parse(content);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      onProgress?.(`⚠️  Failed to load package.json`);
      return null;
    }
  }

  /**
   * Fetches the content of a specific file from a repository
   *
   * Retrieves file content with automatic Base64 decoding. Enforces a 1MB size limit
   * to avoid excessive memory usage and API quota consumption.
   *
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @param path - File path within the repository
   * @param branch - Branch name to fetch from
   * @param onProgress - Optional callback for progress messages
   * @returns Promise resolving to file content as string, or null if file too large/not found
   *
   * @example
   * ```typescript
   * const content = await client.getFileContent('facebook', 'react', 'README.md', 'main');
   * if (content) {
   *   console.log('File size:', content.length);
   * }
   * ```
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

      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      onProgress?.(`✅ Loaded ${path} (${data.size} bytes)`);

      return content;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      onProgress?.(`⚠️  Error fetching ${path}`);
      return null;
    }
  }

  /**
   * Extracts install-time scripts from package.json
   *
   * Identifies npm scripts that execute automatically during package installation.
   * These are security-critical because they run without explicit user permission.
   *
   * Checked script keys:
   * - preinstall, install, postinstall (run during npm install)
   * - prepare (runs after install and before publish)
   * - prepublish, prepublishOnly (run before publishing)
   *
   * @param packageJson - Parsed package.json object (may be null)
   * @returns Array of install script names and commands, or empty array if none found
   *
   * @example
   * ```typescript
   * const scripts = client.getInstallScripts(packageJson);
   * // => ["postinstall: node scripts/setup.js", "prepare: husky install"]
   * ```
   */
  getInstallScripts(packageJson: PackageJson | null): string[] {
    if (!packageJson?.scripts) return [];

    const scripts = packageJson.scripts;
    const installScriptKeys = [
      'preinstall',
      'install',
      'postinstall',
      'prepare',
      'prepublish',
      'prepublishOnly',
    ];

    return installScriptKeys
      .filter((key) => scripts[key])
      .map((key) => `${key}: ${scripts[key]}`);
  }

  /**
   * Finds executable files in the repository file tree
   *
   * Scans the file tree for files with executable extensions that could pose security risks.
   *
   * Detected extensions:
   * - .exe, .bin (Windows/Linux executables)
   * - .sh, .bat, .cmd (Shell scripts)
   * - .ps1 (PowerShell scripts)
   *
   * @param tree - Complete repository file tree from getRepoTree()
   * @returns Array of file paths for all executable files
   *
   * @example
   * ```typescript
   * const executables = client.findExecutableFiles(tree);
   * // => ["scripts/setup.sh", "bin/installer.exe"]
   * ```
   */
  findExecutableFiles(tree: GitHubTreeItem[]): string[] {
    const executableExtensions = [
      '.exe',
      '.sh',
      '.bat',
      '.bin',
      '.cmd',
      '.ps1',
    ];

    return tree
      .filter((item: GitHubTreeItem) => {
        if (item.type !== 'blob') return false;
        return executableExtensions.some((ext) => item.path.endsWith(ext));
      })
      .map((item: GitHubTreeItem) => item.path);
  }

  /**
   * Identifies security-relevant files and prioritizes them for scanning
   *
   * Analyzes the file tree and selects files that are most likely to contain security threats.
   * Files are assigned priority levels (1-4, lower is higher priority) based on risk assessment.
   *
   * Priority Levels:
   * - **Priority 1 (Critical)**: Config files, credentials, .env files, package.json
   * - **Priority 2 (High)**: Install/build scripts that auto-execute (postinstall.js, etc.)
   * - **Priority 3 (Medium)**: Scripts in key directories (scripts/, build/, tools/)
   * - **Priority 4 (Low)**: Executables and config files
   *
   * Files not matching any pattern are excluded to focus scanning on high-risk areas.
   *
   * @param tree - Complete repository file tree from getRepoTree()
   * @returns Array of files to scan, sorted by priority (highest priority first)
   *
   * @example
   * ```typescript
   * const filesToScan = client.findFilesToScan(tree);
   * console.log(filesToScan[0]); // { path: "package.json", priority: 1 }
   * const criticalFiles = filesToScan.filter(f => f.priority === 1);
   * ```
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
      if (item.type !== 'blob') return;

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
   * Fetches content for multiple files with progress tracking
   *
   * Retrieves file contents for a list of files, typically from findFilesToScan().
   * Implements intelligent filtering to skip large files and lock files.
   * Returns a Map for efficient lookups by file path.
   *
   * File Size Limits:
   * - Lock files (package-lock.json, yarn.lock, pnpm-lock.yaml): Skipped entirely
   * - Files > 100KB: Skipped with explanatory message
   *
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @param branch - Branch name to fetch from
   * @param files - Array of files to scan (from findFilesToScan())
   * @param onProgress - Optional callback with (message, current, total) for progress updates
   * @returns Promise resolving to Map of file paths to content (or null/skip message)
   *
   * @example
   * ```typescript
   * const filesToScan = client.findFilesToScan(tree);
   * const contents = await client.scanFiles(
   *   'facebook',
   *   'react',
   *   'main',
   *   filesToScan,
   *   (msg, current, total) => console.log(`${current}/${total}: ${msg}`)
   * );
   *
   * const packageJsonContent = contents.get('package.json');
   * ```
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
        filePath.includes('package-lock.json') ||
        filePath.includes('yarn.lock') ||
        filePath.includes('pnpm-lock.yaml')
      ) {
        scannedFiles.set(filePath, '[Skipped - lock file]');
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

        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        scannedFiles.set(filePath, content);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        scannedFiles.set(filePath, null);
      }
    }

    return scannedFiles;
  }
}
