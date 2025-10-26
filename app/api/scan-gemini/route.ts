/**
 * API Route: POST /api/scan-gemini
 * Scans a repository for security vulnerabilities using Gemini API
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

// Optional: GET endpoint to check API status
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
