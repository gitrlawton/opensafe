/**
 * Gemini API Client for OpenSafe
 * Used for summary generation
 */

export class GeminiClient {
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate a summary using Gemini 2.5 Flash
   */
  async generateSummary(params: {
    repoMetadata: any;
    findings: any;
    safetyLevel: string;
  }): Promise<{ aiSummary: string }> {
    const prompt = this.buildSummaryPrompt(params);

    try {
      const response = await fetch(
        `${this.baseUrl}/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              topP: 0.95,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${error}`);
      }

      const data = await response.json();
      const summary =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Failed to generate summary";

      // Extract JSON from response
      const jsonMatch = summary.match(/\{[\s\S]*"aiSummary"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { aiSummary: parsed.aiSummary };
      }

      // Fallback: wrap the text in the expected format
      return { aiSummary: summary };
    } catch (error) {
      console.error("Gemini API failed, falling back to OpenRouter:", error);
      // Fallback to OpenRouter if Gemini fails
      return this.generateSummaryWithOpenRouter(params);
    }
  }

  /**
   * Build the prompt for summary generation
   */
  private buildSummaryPrompt(params: {
    repoMetadata: any;
    findings: any;
    safetyLevel: string;
  }): string {
    return `You are the Summary Agent for OpenSafe, a repository security scanner.

YOUR ROLE:
Generate a clear, human-readable analysis summary of the repository scan results.

INPUT:
Repository: ${params.repoMetadata?.name || "Unknown"}
Safety Level: ${params.safetyLevel}
Findings: ${JSON.stringify(params.findings, null, 2)}

REQUIRED OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "aiSummary": "Your analysis here"
}

SUMMARY GUIDELINES:

Structure your summary as follows:
1. Opening statement about overall safety
2. Key findings (if any)
3. Specific concerns or recommendations
4. Conclusion

Tone:
- Professional and objective
- Clear and concise (2-4 sentences)
- Focus on actionable information
- Match the tone to the safety level

Examples:

For "safe":
"This repository appears safe for contribution. The codebase follows standard practices with no malicious code, suspicious dependencies, or security concerns detected. All install scripts are benign and no unauthorized network activity was found."

For "warning":
"This repository is generally safe but requires attention. While no malicious code was detected, it uses deprecated dependencies with known vulnerabilities. Consider updating to the latest versions before contributing."

For "severe":
"This repository poses significant security risks and should not be used. Critical issues include obfuscated code, a compromised dependency, and credential harvesting code that transmits environment variables to an external server."

IMPORTANT:
- Mention specific findings by name and location
- Be specific about what was found
- Provide actionable recommendations
- Keep it concise but informative

Return ONLY the JSON object. No additional text.`;
  }

  /**
   * Fallback to OpenRouter if Gemini fails
   */
  private async generateSummaryWithOpenRouter(params: {
    repoMetadata: any;
    findings: any;
    safetyLevel: string;
  }): Promise<{ aiSummary: string }> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      throw new Error(
        "OpenRouter API key not found and Gemini failed. Cannot generate summary."
      );
    }

    const prompt = this.buildSummaryPrompt(params);

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": "https://opensafe.app", // Optional but recommended
            "X-Title": "OpenSafe Security Scanner",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free", // Free tier
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${error}`);
      }

      const data = await response.json();
      const summary =
        data.choices?.[0]?.message?.content ||
        "Failed to generate summary with OpenRouter";

      // Extract JSON from response
      const jsonMatch = summary.match(/\{[\s\S]*"aiSummary"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { aiSummary: parsed.aiSummary };
      }

      // Fallback: wrap the text
      return { aiSummary: summary };
    } catch (error) {
      console.error("OpenRouter fallback also failed:", error);
      // Final fallback: generic summary
      return {
        aiSummary: `Repository scan completed with safety level: ${params.safetyLevel}. Please review findings manually.`,
      };
    }
  }
}
