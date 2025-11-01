/**
 * Scan Helper Functions
 *
 * This module contains the core business logic for repository security scanning.
 * Extracted from API routes for better testability, reusability, and separation of concerns.
 *
 * Key Responsibilities:
 * - Fetching repository context and previous scan data
 * - Determining scan strategy (cached, trusted, or full scan)
 * - Executing AI-powered security analysis
 * - Saving scan results to database
 *
 * Optimization Features:
 * - Returns cached results for unchanged repositories (configurable via ENABLE_UNCHANGED_REPO_CHECK)
 * - Skips AI scans for highly-starred repos (configurable via ENABLE_STAR_THRESHOLD_CHECK)
 *
 * @module lib/scan/scan-helpers
 */

import { GitHubClient } from "@/lib/github/client";
import { GeminiScanWorkflow } from "@/lib/ai/gemini/scan-workflow";
import { getRepoByOwnerAndName, insertScannedRepo } from "@/lib/database/snowflake";
import { DEFAULT_GEMINI_MODEL } from "@/lib/constants";
import {
  isRepoTrustedByStar,
  createTrustedRepoScanResult,
  isRepoUnchangedSinceLastScan,
  mapSafetyLevelToScore,
  logError,
} from "@/lib/utils";
import type { ScanResult } from "@/types/scan";
import type { GitHubRepoMetadata } from "@/types/github";

/**
 * Repository scan context containing metadata and previous scan data
 */
export interface RepoScanContext {
  repoMetadata: GitHubRepoMetadata;
  previousScan: any | null;
}

/**
 * Fetches repository context needed for scanning
 * Retrieves both GitHub metadata and any previous scan from database
 *
 * @param repoOwner - Repository owner username
 * @param repoName - Repository name
 * @param githubToken - GitHub API token (optional)
 * @returns Repository metadata and previous scan data
 * @throws Error if unable to fetch repository metadata from GitHub
 */
export async function fetchRepoScanContext(
  repoOwner: string,
  repoName: string,
  githubToken?: string
): Promise<RepoScanContext> {
  console.log(`[Scan] Checking for previous scan of ${repoOwner}/${repoName}`);
  const previousScan = await getRepoByOwnerAndName(repoOwner, repoName);

  console.log(`[Scan] Fetching repository metadata from GitHub`);
  const githubClient = new GitHubClient(githubToken);
  const repoMetadata = await githubClient.getRepoMetadata(repoOwner, repoName);

  console.log(`[Scan] Repository has ${repoMetadata.stars} stars`);
  console.log(`[Scan] Last pushed at: ${repoMetadata.lastPushedAt}`);

  return { repoMetadata, previousScan };
}

/**
 * Checks if a cached scan result can be returned
 * Returns cached results if repository hasn't changed since last scan
 * Can be disabled via ENABLE_UNCHANGED_REPO_CHECK environment variable
 *
 * @param context - Repository scan context
 * @returns Cached scan result with flag, or null if repo has changed
 */
export function getCachedScanIfUnchanged(
  context: RepoScanContext
): ScanResult | null {
  // Check if optimization is enabled (default: true)
  const isCheckEnabled = process.env.ENABLE_UNCHANGED_REPO_CHECK !== "false";

  if (!isCheckEnabled) {
    console.log("[Scan] Unchanged repo check disabled - proceeding with new scan");
    return null;
  }

  const { repoMetadata, previousScan } = context;

  if (
    previousScan &&
    isRepoUnchangedSinceLastScan(repoMetadata.lastPushedAt, previousScan.SCANNED_AT)
  ) {
    console.log(
      `[Scan] Repository unchanged since last scan on ${previousScan.SCANNED_AT} - returning cached results`
    );

    return {
      ...(previousScan.FINDINGS as ScanResult),
      unchangedSinceLastScan: true,
    };
  }

  return null;
}

/**
 * Determines and executes the appropriate scan strategy
 * - Returns trusted result if repo has enough stars (unless disabled)
 * - Otherwise performs full AI-powered security scan
 * Can be disabled via ENABLE_STAR_THRESHOLD_CHECK environment variable
 *
 * @param repoUrl - Full GitHub repository URL
 * @param repoMetadata - Repository metadata from GitHub
 * @param geminiApiKey - Gemini API key for AI scanning
 * @param githubToken - GitHub API token (optional)
 * @returns Scan result based on chosen strategy
 */
export async function executeScanStrategy(
  repoUrl: string,
  repoMetadata: GitHubRepoMetadata,
  geminiApiKey: string,
  githubToken?: string
): Promise<ScanResult> {
  // Check if star threshold optimization is enabled (default: true)
  const isStarCheckEnabled = process.env.ENABLE_STAR_THRESHOLD_CHECK !== "false";

  // Check if repository is trusted based on star count
  if (isStarCheckEnabled && isRepoTrustedByStar(repoMetadata)) {
    console.log(
      `[Scan] Repository has ${repoMetadata.stars} stars - marking as trusted and skipping scan`
    );
    return createTrustedRepoScanResult(repoUrl, repoMetadata);
  }

  if (!isStarCheckEnabled) {
    console.log("[Scan] Star threshold check disabled - proceeding with full scan");
  }

  // Execute full AI-powered security scan
  console.log(`[Scan] Performing full security scan`);

  const workflow = new GeminiScanWorkflow({
    geminiApiKey,
    githubToken,
    geminiModel: DEFAULT_GEMINI_MODEL,
  });

  console.log(`[Scan] Starting Gemini-based scan for: ${repoUrl}`);
  const result = await workflow.scanRepository(repoUrl);
  console.log(`[Scan] Scan completed: ${result.safetyLevel}`);

  return result;
}

/**
 * Saves scan results to the database
 * Continues execution even if save fails (doesn't throw)
 *
 * @param repoOwner - Repository owner username
 * @param repoName - Repository name
 * @param result - Scan result to save
 * @param scannedBy - User who initiated the scan
 */
export async function saveScanResults(
  repoOwner: string,
  repoName: string,
  result: ScanResult,
  scannedBy: string
): Promise<void> {
  const safetyScore = mapSafetyLevelToScore(result.safetyLevel);
  const language = result.repoMetadata?.language || "Unknown";

  console.log(`[Scan] Detected language: ${language}`);

  try {
    await insertScannedRepo({
      repoOwner,
      repoName,
      language,
      safetyScore,
      findings: result,
      scannedBy,
    });
    console.log(`[Scan] Results saved to database for ${repoOwner}/${repoName}`);
  } catch (error) {
    logError("[Scan]", "Failed to save to database", error);
    // Continue even if database save fails - don't fail the entire request
  }
}
