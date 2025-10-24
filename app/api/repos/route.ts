/**
 * API Route: GET /api/repos
 * Fetches scanned repositories from Snowflake
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getScannedRepos } from "@/lib/database/snowflake";
import { formatTimestamp, createApiError, logError } from "@/lib/utils";
import { MAX_REPOS_FETCH_LIMIT } from "@/lib/constants";
import {
  reposQuerySchema,
  createValidationError,
  sanitizeString,
} from "@/lib/validations/api";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      owner: searchParams.get("owner") || undefined,
      language: searchParams.get("language") || undefined,
    };

    let validatedParams: {
      limit?: number;
      offset?: number;
      owner?: string;
      language?: string;
    };

    try {
      validatedParams = reposQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(createValidationError(error), { status: 400 });
      }
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    // Use validated limit or default to MAX_REPOS_FETCH_LIMIT
    const limit = validatedParams.limit || MAX_REPOS_FETCH_LIMIT;

    // Ensure limit doesn't exceed maximum
    const finalLimit = Math.min(limit, MAX_REPOS_FETCH_LIMIT);

    const repos = await getScannedRepos(finalLimit);

    // Transform and sanitize Snowflake data to match frontend format
    const transformedRepos = repos.map((repo) => ({
      id: sanitizeString(
        repo.ID?.toString() || `${repo.REPO_OWNER}-${repo.REPO_NAME}`
      ),
      name: sanitizeString(repo.REPO_NAME || ""),
      owner: sanitizeString(repo.REPO_OWNER || ""),
      language: sanitizeString(repo.LANGUAGE || "Unknown"),
      safetyScore: repo.SAFETY_SCORE, // "SAFE", "CAUTION", or "UNSAFE" - enum is safe
      lastScanned: formatTimestamp(repo.SCANNED_AT),
      scannedBy: sanitizeString(repo.SCANNED_BY || ""),
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
