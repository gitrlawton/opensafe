/**
 * API Route: POST /api/scan-gemini
 * Scans a repository for security vulnerabilities using Gemini API
 */

import { NextRequest, NextResponse } from "next/server";
import { GeminiScanWorkflow } from "@/lib/scan-gemini/workflow-gemini";
import { auth0 } from "@/lib/auth0";
import { insertScannedRepo } from "@/lib/snowflake";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { repoUrl } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 }
      );
    }

    // Extract repo owner and name from URL
    const urlMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!urlMatch) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL" },
        { status: 400 }
      );
    }
    const [, repoOwner, repoName] = urlMatch;
    const cleanRepoName = repoName.replace(/\.git$/, "");

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
      geminiModel: "gemini-2.5-flash-lite", // Faster model for quicker scans
    });

    // Execute scan
    console.log(`[API] Starting Gemini-based scan for: ${repoUrl}`);
    const result = await workflow.scanRepository(repoUrl);
    console.log(`[API] Scan completed: ${result.safetyLevel}`);

    // Map safety level from scan result to database format
    const safetyScoreMap: Record<string, "SAFE" | "CAUTION" | "UNSAFE"> = {
      safe: "SAFE",
      warning: "CAUTION",
      severe: "UNSAFE",
    };
    const safetyScore = safetyScoreMap[result.safetyLevel] || "CAUTION";

    // Detect language from repo metadata or use a default
    const language = result.repoMetadata?.language || "Unknown";

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
      console.log(`[API] Scan results saved to Snowflake for ${repoOwner}/${cleanRepoName}`);
    } catch (snowflakeError: any) {
      console.error("[API] Failed to save to Snowflake:", snowflakeError);
      // Continue even if Snowflake save fails - don't fail the entire request
    }

    // Return results
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API] Scan error:", error);

    return NextResponse.json(
      {
        error: "Scan failed",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check API status
export async function GET() {
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
