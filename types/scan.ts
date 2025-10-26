/**
 * Security Scan Type Definitions
 * Shared types for repository security scanning
 */

import type { GitHubRepoMetadata, PackageJson } from "./github";

/**
 * Security finding severity levels
 */
export type FindingSeverity = "low" | "moderate" | "severe";

/**
 * Safety assessment levels
 */
export type SafetyLevel = "safe" | "caution" | "unsafe";

/**
 * Safety score (database format)
 */
export type SafetyScore = "SAFE" | "CAUTION" | "UNSAFE";

/**
 * Individual security finding
 */
export interface Finding {
  item: string;
  location: string;
  issue: string;
  severity: FindingSeverity;
  codeSnippet?: string;
  batchId?: number;
  dependencyUrl?: string;
}

/**
 * Categorized security findings
 */
export interface Findings {
  maliciousCode: Finding[];
  dependencies: Finding[];
  networkActivity: Finding[];
  fileSystemSafety: Finding[];
  credentialSafety: Finding[];
}

/**
 * Complete scan result
 */
export interface ScanResult {
  repoUrl: string;
  repoMetadata?: GitHubRepoMetadata;
  findings: Findings;
  safetyLevel: SafetyLevel;
  aiSummary: string;
  scannedAt: string;
  validated: boolean;
  corrections?: string[];
  trustedByStar?: boolean; // Indicates the repo was marked safe based on star count
  unchangedSinceLastScan?: boolean; // Indicates the repo hasn't been updated since last scan
}

/**
 * Repository content data (from GitHub fetch)
 */
export interface RepoContentData {
  repoMetadata: GitHubRepoMetadata;
  scannedFiles: Record<string, string | null>;
  files: {
    packageJson: PackageJson | null;
    installScripts: string[];
    executableFiles: string[];
  };
  dependencies: {
    production: string[];
    dev: string[];
  };
  treeSize: number;
  filesScanned: number;
}

/**
 * Gemini API schema structure
 * Note: type should be SchemaType from @google/generative-ai but we use any here to avoid circular dependencies
 */
export interface GeminiSchema {
  type: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  description?: string;
}

/**
 * Gemini workflow configuration
 */
export interface GeminiWorkflowConfig {
  geminiApiKey: string;
  githubToken?: string;
  geminiModel?: string;
}

/**
 * Gemini service configuration
 */
export interface GeminiServiceConfig {
  apiKey: string;
  model?: string;
}
