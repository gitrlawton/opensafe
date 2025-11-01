/**
 * API Route: POST /api/scan-gemini
 *
 * Orchestrates the complete security scanning workflow for a GitHub repository.
 * This is the main API endpoint for initiating repository security scans.
 *
 * Workflow:
 * 1. Authenticates user via Auth0
 * 2. Validates and sanitizes repository URL
 * 3. Checks for cached results (if repo unchanged since last scan)
 * 4. Determines scan strategy (trusted by stars or full AI scan)
 * 5. Executes scan using Gemini AI
 * 6. Saves results to database
 * 7. Returns scan results to client
 *
 * Request Body:
 * ```json
 * {
 *   "repoUrl": "https://github.com/owner/repository"
 * }
 * ```
 *
 * Response Format (ScanResult):
 * ```json
 * {
 *   "repoUrl": "https://github.com/owner/repo",
 *   "repoMetadata": { "owner": "...", "name": "...", "stars": 0, ... },
 *   "safetyLevel": "safe" | "caution" | "unsafe",
 *   "findings": {
 *     "maliciousCode": [...],
 *     "dependencies": [...],
 *     "networkActivity": [...],
 *     "fileSystemSafety": [...],
 *     "credentialSafety": [...]
 *   },
 *   "aiSummary": "AI-generated summary",
 *   "scannedAt": "ISO timestamp",
 *   "validated": true,
 *   "unchangedSinceLastScan": false // optional flag
 * }
 * ```
 *
 * Optimization Flags (Environment Variables):
 * - ENABLE_STAR_THRESHOLD_CHECK: Skip AI scan for repos with 1000+ stars (default: true)
 * - ENABLE_UNCHANGED_REPO_CHECK: Return cached results for unchanged repos (default: true)
 *
 * Error Responses:
 * - 400: Invalid request (bad URL, validation error)
 * - 401: Unauthorized (not logged in)
 * - 500: Server error (API key missing, database error, scan failed)
 *
 * @route POST /api/scan-gemini
 * @access Protected (requires Auth0 authentication)
 * @module app/api/scan-gemini
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth0 } from "@/lib/auth0";
import { parseGitHubUrl, createApiError, logError } from "@/lib/utils";
import {
  scanRequestSchema,
  validateAndSanitize,
  createValidationError,
} from "@/lib/validations/api";
import {
  fetchRepoScanContext,
  getCachedScanIfUnchanged,
  executeScanStrategy,
  saveScanResults,
} from "@/lib/scan/scan-helpers";

/**
 * POST handler for repository security scanning
 *
 * Thin HTTP handler that orchestrates the scan workflow by delegating to
 * service layer functions in lib/scan/scan-helpers.ts. Handles authentication,
 * validation, and HTTP-specific concerns only.
 *
 * @param request - Next.js request object with JSON body containing repoUrl
 * @returns JSON response with scan results or error
 * @throws Never throws - all errors are caught and returned as JSON responses
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const response = await fetch('/api/scan-gemini', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ repoUrl: 'https://github.com/facebook/react' })
 * });
 * const result = await response.json();
 * console.log(result.safetyLevel); // "safe" | "caution" | "unsafe"
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Validate user session has required fields
    if (!session.user.email && !session.user.name) {
      return NextResponse.json(
        { error: "Invalid user session - missing user identifier" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate and sanitize input
    let validatedData: { repoUrl: string };
    try {
      validatedData = validateAndSanitize(scanRequestSchema, body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(createValidationError(error), { status: 400 });
      }
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { repoUrl } = validatedData;

    // Extract repo owner and name from URL
    let repoOwner: string;
    let cleanRepoName: string;
    try {
      const parsed = parseGitHubUrl(repoUrl);
      repoOwner = parsed.owner;
      cleanRepoName = parsed.repo;
    } catch (error) {
      return NextResponse.json(
        createApiError("Invalid GitHub repository URL"),
        { status: 400 }
      );
    }

    // Validate environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "Missing GEMINI_API_KEY environment variable",
        },
        { status: 500 }
      );
    }

    // Fetch repository context (metadata + previous scan)
    let scanContext;
    try {
      scanContext = await fetchRepoScanContext(
        repoOwner,
        cleanRepoName,
        githubToken
      );
    } catch (error) {
      logError("[API]", "Failed to fetch repository metadata", error);
      return NextResponse.json(
        createApiError("Failed to fetch repository information"),
        { status: 400 }
      );
    }

    // Check if we can return cached results (repo unchanged since last scan)
    const cachedResult = getCachedScanIfUnchanged(scanContext);
    if (cachedResult) {
      return NextResponse.json(cachedResult, { status: 200 });
    }

    // Execute appropriate scan strategy (trusted by stars or full AI scan)
    const result = await executeScanStrategy(
      repoUrl,
      scanContext.repoMetadata,
      geminiApiKey,
      githubToken
    );

    // Save scan results to database
    await saveScanResults(
      repoOwner,
      cleanRepoName,
      result,
      session.user.email || session.user.name || "unknown"
    );

    // Return results
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logError("[API]", "Scan error", error);

    return NextResponse.json(createApiError("Scan failed"), { status: 500 });
  }
}

/**
 * GET handler for API status and information
 *
 * Returns metadata about the scanning API including provider, rate limits,
 * and available endpoints. Useful for health checks and API documentation.
 *
 * @returns JSON response with API status and metadata
 *
 * @example
 * ```typescript
 * // Check API status
 * const response = await fetch('/api/scan-gemini');
 * const info = await response.json();
 * console.log(info.status); // "online"
 * console.log(info.rateLimits.free); // "10 requests/minute, 250 requests/day"
 * ```
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "online",
      message: "OpenSafe Repository Scanner API (Gemini-powered)",
      provider: "Google Gemini API",
      model: "gemini-2.5-flash-lite",
      rateLimits: {
        free: "10 requests/minute, 250 requests/day",
        tokenLimit: "250,000 tokens/minute",
      },
      endpoints: {
        scan: "POST /api/scan-gemini",
      },
    },
    { status: 200 }
  );
}
