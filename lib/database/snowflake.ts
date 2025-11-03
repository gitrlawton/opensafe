/**
 * Snowflake Database Layer
 *
 * This module provides database operations for persisting and retrieving scan results.
 * Uses Snowflake as the data warehouse for storing repository scan history.
 *
 * Architecture:
 * - Connection pooling: Reuses a single connection across requests for performance
 * - Parameterized queries: All queries use bound parameters to prevent SQL injection
 * - UPSERT pattern: Uses MERGE statements to update existing records or insert new ones
 *
 * Schema:
 * - Table: SCANNED_REPOS
 * - Primary key: (REPO_OWNER, REPO_NAME) composite
 * - Indexes: SCANNED_AT for efficient time-based queries
 *
 * @module lib/database/snowflake
 */

import 'server-only';
import snowflake from 'snowflake-sdk';
import type {
  InsertScannedRepoData,
  SnowflakeRepoRecord,
} from '@/types/database';

/**
 * Snowflake connection configuration
 * Loads credentials from environment variables
 */
const connectionOptions: snowflake.ConnectionOptions = {
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME!,
  password: process.env.SNOWFLAKE_PASSWORD!,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
  database: process.env.SNOWFLAKE_DATABASE!,
  schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
};

/**
 * Singleton connection instance for connection pooling
 * Reused across requests to avoid reconnection overhead
 */
let connection: snowflake.Connection | null = null;

/**
 * Gets or creates a Snowflake database connection
 *
 * Implements connection pooling by reusing an existing connection if available.
 * If no connection exists or the connection is down, creates a new one.
 *
 * @returns Promise resolving to an active Snowflake connection
 * @throws {Error} If unable to connect to Snowflake (invalid credentials, network issues)
 *
 * @example
 * ```typescript
 * const conn = await getConnection();
 * // Use connection for queries
 * ```
 */
export function getConnection(): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    if (connection && connection.isUp()) {
      resolve(connection);
      return;
    }

    connection = snowflake.createConnection(connectionOptions);
    connection.connect((err, conn) => {
      if (err) {
        console.error('Unable to connect to Snowflake:', err.message);
        reject(err);
      } else {
        console.log('Successfully connected to Snowflake');
        resolve(conn);
      }
    });
  });
}

/**
 * Executes a parameterized SQL query against Snowflake
 *
 * Generic function for running any SQL query with optional bound parameters.
 * Uses parameterized queries to prevent SQL injection attacks.
 *
 * @template T - The expected type of each row in the result set
 * @param query - SQL query string with ? placeholders for parameters
 * @param binds - Optional array of values to bind to query parameters
 * @returns Promise resolving to array of query results
 * @throws {Error} If query execution fails (syntax error, permission denied, etc.)
 *
 * @example
 * ```typescript
 * // Simple query without parameters
 * const repos = await executeQuery<RepoRecord>('SELECT * FROM SCANNED_REPOS LIMIT 10');
 *
 * // Query with bound parameters
 * const repo = await executeQuery<RepoRecord>(
 *   'SELECT * FROM SCANNED_REPOS WHERE REPO_OWNER = ? AND REPO_NAME = ?',
 *   ['facebook', 'react']
 * );
 * ```
 */
export function executeQuery<T = any>(
  query: string,
  binds?: snowflake.Binds
): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const conn = await getConnection();

      conn.execute({
        sqlText: query,
        binds: binds,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Failed to execute query:', err.message);
            reject(err);
          } else {
            resolve((rows as T[]) || []);
          }
        },
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Inserts or updates a repository scan result in Snowflake
 *
 * Uses SQL MERGE (UPSERT) to either update an existing scan record or insert a new one.
 * If a scan already exists for the given repo owner/name combination, it updates the record
 * with the latest findings. Otherwise, it creates a new record.
 *
 * @param data - Repository scan data to persist
 * @param data.repoOwner - GitHub repository owner username
 * @param data.repoName - GitHub repository name
 * @param data.language - Primary programming language
 * @param data.safetyScore - Safety score ("SAFE", "CAUTION", or "UNSAFE")
 * @param data.findings - Complete findings object from scan
 * @param data.scannedBy - User identifier who initiated the scan
 * @returns Promise that resolves when the upsert completes
 * @throws {Error} If database operation fails
 *
 * @example
 * ```typescript
 * await insertScannedRepo({
 *   repoOwner: 'facebook',
 *   repoName: 'react',
 *   language: 'JavaScript',
 *   safetyScore: 'SAFE',
 *   findings: { maliciousCode: [], dependencies: [], ... },
 *   scannedBy: 'user@example.com'
 * });
 * ```
 */
export async function insertScannedRepo(
  data: InsertScannedRepoData
): Promise<void> {
  // Use MERGE to UPSERT - update if exists, insert if not
  // Pass timestamp explicitly in UTC to avoid timezone issues
  const scannedAtUTC = new Date().toISOString();

  const query = `
    MERGE INTO SCANNED_REPOS AS target
    USING (
      SELECT
        ? AS REPO_OWNER,
        ? AS REPO_NAME,
        ? AS LANGUAGE,
        ? AS SAFETY_SCORE,
        PARSE_JSON(?) AS FINDINGS,
        ? AS SCANNED_BY,
        ? AS SCANNED_AT
    ) AS source
    ON target.REPO_OWNER = source.REPO_OWNER
       AND target.REPO_NAME = source.REPO_NAME
    WHEN MATCHED THEN
      UPDATE SET
        LANGUAGE = source.LANGUAGE,
        SAFETY_SCORE = source.SAFETY_SCORE,
        FINDINGS = source.FINDINGS,
        SCANNED_BY = source.SCANNED_BY,
        SCANNED_AT = source.SCANNED_AT
    WHEN NOT MATCHED THEN
      INSERT (REPO_OWNER, REPO_NAME, LANGUAGE, SAFETY_SCORE, FINDINGS, SCANNED_BY, SCANNED_AT)
      VALUES (source.REPO_OWNER, source.REPO_NAME, source.LANGUAGE, source.SAFETY_SCORE, source.FINDINGS, source.SCANNED_BY, source.SCANNED_AT)
  `;

  await executeQuery(query, [
    data.repoOwner,
    data.repoName,
    data.language,
    data.safetyScore,
    JSON.stringify(data.findings),
    data.scannedBy,
    scannedAtUTC,
  ]);

  console.log(
    `✅ Successfully saved scan to Snowflake: ${data.repoOwner}/${data.repoName} at ${scannedAtUTC}`
  );
}

/**
 * Retrieves the most recently scanned repositories from Snowflake
 *
 * Fetches scan records ordered by scan timestamp (most recent first).
 * Used to populate the home page with recent scan history.
 *
 * @param limit - Maximum number of records to return (default: 100, max: 100)
 * @returns Promise resolving to array of repository scan records
 * @throws {Error} If database query fails
 *
 * @example
 * ```typescript
 * // Get 10 most recent scans
 * const recentScans = await getScannedRepos(10);
 *
 * // Get default 100 most recent scans
 * const allRecentScans = await getScannedRepos();
 * ```
 */
export async function getScannedRepos(
  limit: number = 100
): Promise<SnowflakeRepoRecord[]> {
  const query = `
    SELECT
      ID,
      REPO_OWNER,
      REPO_NAME,
      LANGUAGE,
      SAFETY_SCORE,
      FINDINGS,
      SCANNED_AT,
      SCANNED_BY
    FROM SCANNED_REPOS
    ORDER BY SCANNED_AT DESC
    LIMIT ?
  `;

  return executeQuery(query, [limit]);
}

/**
 * Retrieves the most recent scan record for a specific repository
 *
 * Looks up a repository by owner and name, returning the most recent scan if found.
 * Used to check if a repository has been scanned before and retrieve cached results.
 *
 * @param owner - GitHub repository owner username
 * @param name - GitHub repository name
 * @returns Promise resolving to the scan record if found, or null if never scanned
 * @throws {Error} If database query fails
 *
 * @example
 * ```typescript
 * const previousScan = await getRepoByOwnerAndName('facebook', 'react');
 * if (previousScan) {
 *   console.log('Last scanned:', previousScan.SCANNED_AT);
 *   console.log('Safety score:', previousScan.SAFETY_SCORE);
 * } else {
 *   console.log('Repository has never been scanned');
 * }
 * ```
 */
export async function getRepoByOwnerAndName(
  owner: string,
  name: string
): Promise<SnowflakeRepoRecord | null> {
  const query = `
    SELECT
      ID,
      REPO_OWNER,
      REPO_NAME,
      LANGUAGE,
      SAFETY_SCORE,
      FINDINGS,
      SCANNED_AT,
      SCANNED_BY
    FROM SCANNED_REPOS
    WHERE REPO_OWNER = ? AND REPO_NAME = ?
    ORDER BY SCANNED_AT DESC
    LIMIT 1
  `;

  const results = await executeQuery(query, [owner, name]);
  return results.length > 0 ? results[0] : null;
}
