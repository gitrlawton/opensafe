/**
 * API Route: GET /api/repos
 * Fetches scanned repositories from Snowflake
 */

import { NextResponse } from "next/server";
import { getScannedRepos } from "@/lib/snowflake";

export async function GET() {
  try {
    const repos = await getScannedRepos(100); // Get last 100 scans

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
  } catch (error: any) {
    console.error("[API] Failed to fetch repos from Snowflake:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch repositories",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

function formatTimestamp(timestamp: string | Date): string {
  if (!timestamp) return "Unknown";

  // Snowflake returns TIMESTAMP_NTZ in format like "2025-01-19T08:23:31.000Z"
  // Parse it as UTC and convert to local time
  const scanned = new Date(timestamp);

  // Check if the date is valid
  if (isNaN(scanned.getTime())) {
    console.error("Invalid timestamp:", timestamp);
    return "Unknown";
  }

  const now = new Date();
  const diffMs = now.getTime() - scanned.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Debug log
  console.log(`Timestamp debug: now=${now.toISOString()}, scanned=${scanned.toISOString()}, diffMins=${diffMins}`);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return scanned.toLocaleDateString();
}
