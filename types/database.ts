/**
 * Database Type Definitions
 * Shared types for Snowflake database operations
 */

import type { SafetyScore, ScanResult } from "./scan";

/**
 * Scanned repository data to insert into database
 */
export interface InsertScannedRepoData {
  repoOwner: string;
  repoName: string;
  language: string;
  safetyScore: SafetyScore;
  findings: ScanResult;
  scannedBy: string;
}

/**
 * Scanned repository record from database (Snowflake column naming)
 */
export interface SnowflakeRepoRecord {
  ID: string | number;
  REPO_OWNER: string;
  REPO_NAME: string;
  LANGUAGE: string;
  SAFETY_SCORE: SafetyScore;
  FINDINGS: ScanResult;
  SCANNED_AT: string;
  SCANNED_BY: string;
}

/**
 * Query parameters for fetching repositories
 */
export interface ReposQueryParams {
  limit?: number;
  offset?: number;
  safetyScore?: SafetyScore;
}
