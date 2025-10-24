/**
 * API Route: POST /api/scan-gemini
 * Scans a repository for security vulnerabilities using Gemini API
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { GeminiScanWorkflow } from "@/lib/ai/gemini/scan-workflow";
import { auth0 } from "@/lib/auth0";
import { insertScannedRepo } from "@/lib/database/snowflake";
import { DEFAULT_GEMINI_MODEL } from "@/lib/constants";
import {
  mapSafetyLevelToScore,
  parseGitHubUrl,
  createApiError,
  logError,
} from "@/lib/utils";
import {
  scanRequestSchema,
  validateAndSanitize,
  createValidationError,
} from "@/lib/validations/api";

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

    // Initialize Gemini workflow
    const workflow = new GeminiScanWorkflow({
      geminiApiKey,
      githubToken,
      geminiModel: DEFAULT_GEMINI_MODEL,
    });

    // Execute scan
    console.log(`[API] Starting Gemini-based scan for: ${repoUrl}`);
    const result = await workflow.scanRepository(repoUrl);
    console.log(`[API] Scan completed: ${result.safetyLevel}`);
    console.log(
      `[API] Repo metadata:`,
      JSON.stringify(result.repoMetadata, null, 2)
    );

    // Map safety level from scan result to database format
    const safetyScore = mapSafetyLevelToScore(result.safetyLevel);

    // Detect language from repo metadata or use a default
    const language = result.repoMetadata?.language || "Unknown";
    console.log(`[API] Detected language: ${language}`);

    // Save results to Snowflake
    try {
      await insertScannedRepo({
        repoOwner,
        repoName: cleanRepoName,
        language,
        safetyScore,
        findings: result,
        scannedBy: session.user.email || session.user.name || "unknown",
      });
      console.log(
        `[API] Scan results saved to Snowflake for ${repoOwner}/${cleanRepoName}`
      );
    } catch (snowflakeError) {
      logError("[API]", "Failed to save to Snowflake", snowflakeError);
      // Continue even if Snowflake save fails - don't fail the entire request
    }

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
