/**
 * API Route: POST /api/scan-gemini
 * Scans a repository for security vulnerabilities using Gemini API
 */

import { NextRequest, NextResponse } from "next/server";
import { GeminiScanWorkflow } from "@/lib/scan-gemini/workflow-gemini";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { repoUrl } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
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
      geminiModel: "gemini-2.5-flash-lite", // Faster model for quicker scans
    });

    // Execute scan
    console.log(`[API] Starting Gemini-based scan for: ${repoUrl}`);
    const result = await workflow.scanRepository(repoUrl);
    console.log(`[API] Scan completed: ${result.safetyLevel}`);

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
