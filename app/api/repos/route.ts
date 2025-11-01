/**
 * API Route: GET /api/repos
 *
 * Fetches a list of scanned repositories from the database.
 * Returns repository metadata including safety scores and last scan timestamps.
 *
 * Query Parameters:
 * - `limit` (optional): Number of repos to return (max: 100, default: 100)
 * - `offset` (optional): Pagination offset (not currently implemented in DB query)
 * - `owner` (optional): Filter by repository owner (not currently implemented)
 * - `language` (optional): Filter by programming language (not currently implemented)
 *
 * Response Format:
 * ```json
 * [
 *   {
 *     "id": "unique-id",
 *     "name": "repository-name",
 *     "owner": "owner-username",
 *     "language": "JavaScript",
 *     "safetyScore": "SAFE" | "CAUTION" | "UNSAFE",
 *     "lastScanned": "2 hours ago",
 *     "scannedBy": "user@example.com"
 *   }
 * ]
 * ```
 *
 * Error Responses:
 * - 400: Invalid query parameters (validation error with details)
 * - 500: Database query failed
 *
 * @route GET /api/repos
 * @access Public (no authentication required)
 * @module app/api/repos
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

/**
 * GET handler for fetching scanned repositories
 *
 * Retrieves a paginated list of repositories that have been scanned,
 * including their safety scores and scan metadata. All data is sanitized
 * before being sent to the client.
 *
 * @param request - Next.js request object with query parameters
 * @returns JSON response with array of repository objects or error
 *
 * @example
 * ```typescript
 * // Fetch default 100 repos
 * fetch('/api/repos')
 *
 * // Fetch 10 repos
 * fetch('/api/repos?limit=10')
 *
 * // Filter by language (not yet implemented in DB query)
 * fetch('/api/repos?language=JavaScript')
 * ```
 */
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
