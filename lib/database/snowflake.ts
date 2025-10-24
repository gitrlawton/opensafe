import "server-only";
import snowflake from "snowflake-sdk";
import type { InsertScannedRepoData, SnowflakeRepoRecord } from "@/types/database";

// Snowflake connection configuration
const connectionOptions: snowflake.ConnectionOptions = {
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME!,
  password: process.env.SNOWFLAKE_PASSWORD!,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
  database: process.env.SNOWFLAKE_DATABASE!,
  schema: process.env.SNOWFLAKE_SCHEMA || "PUBLIC",
};

// Create a connection pool for reuse
let connection: snowflake.Connection | null = null;

export function getConnection(): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    if (connection && connection.isUp()) {
      resolve(connection);
      return;
    }

    connection = snowflake.createConnection(connectionOptions);
    connection.connect((err, conn) => {
      if (err) {
        console.error("Unable to connect to Snowflake:", err.message);
        reject(err);
      } else {
        console.log("Successfully connected to Snowflake");
        resolve(conn);
      }
    });
  });
}

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
            console.error("Failed to execute query:", err.message);
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

export async function insertScannedRepo(data: InsertScannedRepoData): Promise<void> {
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

  console.log(`✅ Successfully saved scan to Snowflake: ${data.repoOwner}/${data.repoName} at ${scannedAtUTC}`);
}

export async function getScannedRepos(limit: number = 100): Promise<SnowflakeRepoRecord[]> {
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
