/**
 * Summary Service
 * Handles AI summary generation using Gemini API
 */

import { GeminiClient } from "./gemini-client";

export async function generateScanSummary(params: {
  repoMetadata: any;
  findings: any;
  safetyLevel: string;
}): Promise<{ aiSummary: string }> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    console.warn(
      "GEMINI_API_KEY not found. Summary generation will be limited."
    );
    return {
      aiSummary: `Repository scan completed with safety level: ${params.safetyLevel}. Please review findings manually. (Note: Set GEMINI_API_KEY for AI-generated summaries)`,
    };
  }

  const client = new GeminiClient(geminiKey);

  try {
    console.log("Generating AI summary with Gemini...");
    const result = await client.generateSummary(params);
    console.log("✓ Summary generated successfully");
    return result;
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return {
      aiSummary: `Repository scan completed with safety level: ${params.safetyLevel}. Summary generation failed. Please review findings manually.`,
    };
  }
}
