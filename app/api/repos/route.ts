/**
 * API Route: GET /api/repos
 * Fetches scanned repositories from Snowflake
 */

import { NextResponse } from "next/server";
import { getScannedRepos } from "@/lib/database/snowflake";
import { formatTimestamp, createApiError, logError } from "@/lib/utils";
import { MAX_REPOS_FETCH_LIMIT } from "@/lib/constants";

export async function GET() {
  try {
    const repos = await getScannedRepos(MAX_REPOS_FETCH_LIMIT);

    // Transform Snowflake data to match frontend format
    const transformedRepos = repos.map((repo: any) => ({
      id: repo.ID?.toString() || `${repo.REPO_OWNER}-${repo.REPO_NAME}`,
      name: repo.REPO_NAME,
      owner: repo.REPO_OWNER,
      language: repo.LANGUAGE || "Unknown",
      safetyScore: repo.SAFETY_SCORE, // "SAFE", "CAUTION", or "UNSAFE"
      lastScanned: formatTimestamp(repo.SCANNED_AT),
      scannedBy: repo.SCANNED_BY,
    }));

    return NextResponse.json(transformedRepos, { status: 200 });
  } catch (error) {
    logError("[API]", "Failed to fetch repos from Snowflake", error);

    return NextResponse.json(
      createApiError("Failed to fetch repositories"),
      { status: 500 }
    );
  }
}
