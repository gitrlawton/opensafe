/**
 * GitHub API Type Definitions
 * Shared types for GitHub API interactions
 */

/**
 * GitHub repository metadata
 */
export interface GitHubRepoMetadata {
  owner: string;
  name: string;
  defaultBranch: string;
  language?: string;
  description?: string;
  stars?: number;
}

/**
 * GitHub file content
 */
export interface GitHubFile {
  path: string;
  content: string;
  size: number;
  type: string;
}

/**
 * GitHub tree item
 */
export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
}

/**
 * File to scan with priority
 */
export interface FileToScan {
  path: string;
  priority: 1 | 2 | 3 | 4 | 5;
}

/**
 * Parsed GitHub URL
 */
export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}

/**
 * Package.json structure
 */
export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}
