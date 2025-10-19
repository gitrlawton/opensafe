import "server-only";
import snowflake from "snowflake-sdk";

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

export async function insertScannedRepo(data: {
  repoOwner: string;
  repoName: string;
  language: string;
  safetyScore: "SAFE" | "CAUTION" | "UNSAFE";
  findings: any;
  scannedBy: string;
}): Promise<void> {
  // Use SELECT instead of VALUES to allow PARSE_JSON with bind parameters
  const query = `
    INSERT INTO SCANNED_REPOS (
      REPO_OWNER,
      REPO_NAME,
      LANGUAGE,
      SAFETY_SCORE,
      FINDINGS,
      SCANNED_BY
    ) SELECT ?, ?, ?, ?, PARSE_JSON(?), ?
  `;

  await executeQuery(query, [
    data.repoOwner,
    data.repoName,
    data.language,
    data.safetyScore,
    JSON.stringify(data.findings),
    data.scannedBy,
  ]);

  console.log(`✅ Successfully saved scan to Snowflake: ${data.repoOwner}/${data.repoName}`);
}

export async function getScannedRepos(limit: number = 100): Promise<any[]> {
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
): Promise<any | null> {
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
