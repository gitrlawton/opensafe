/**
 * Gemini Service - Handles communication with Google Gemini API
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { sleep } from "@/lib/utils";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MIN_REQUEST_INTERVAL_MS,
  GEMINI_MAX_RETRIES,
  GEMINI_DEFAULT_TEMPERATURE,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_RATE_LIMIT_BASE_WAIT_MS,
  GEMINI_RETRY_WAIT_MS,
  MS_PER_MINUTE,
} from "@/lib/constants";
import type { GeminiServiceConfig, GeminiSchema } from "@/types/scan";

// Re-export SchemaType for use in workflow
export { SchemaType };

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = GEMINI_MIN_REQUEST_INTERVAL_MS;

  constructor(config: GeminiServiceConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || DEFAULT_GEMINI_MODEL;
  }

  /**
   * Enforce rate limiting - wait if needed
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(
        `      ⏸️  Rate limit: waiting ${waitTime / 1000}s before next request...`
      );
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Call Gemini API with a prompt
   * Includes automatic rate limiting and retry logic
   */
  async callGemini(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      thinkingBudget?: number; // Set to 0 to disable, higher values for deeper reasoning
      maxRetries?: number;
      responseSchema?: GeminiSchema; // JSON schema for structured output
    }
  ): Promise<string> {
    const maxRetries = options?.maxRetries ?? GEMINI_MAX_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Enforce rate limiting
        await this.enforceRateLimit();

        console.log(
          `      📤 Calling Gemini API (attempt ${attempt + 1}/${maxRetries})...`
        );
        const requestStart = Date.now();

        const model = this.genAI.getGenerativeModel({
          model: this.model,
          generationConfig: {
            temperature: options?.temperature ?? GEMINI_DEFAULT_TEMPERATURE,
            // Gemini 2.5 Flash Lite maximum output tokens: 65,536
            // Use high default to allow room for both thinking and output
            maxOutputTokens: options?.maxTokens ?? GEMINI_MAX_OUTPUT_TOKENS,
            // Apply thinking budget if specified, otherwise unlimited
            ...(options?.thinkingBudget !== undefined && {
              thinkingConfig: {
                thinkingBudget: options.thinkingBudget,
              },
            }),
            // Structured output configuration
            ...(options?.responseSchema && {
              responseMimeType: "application/json",
              responseSchema: options.responseSchema,
            }),
          },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;

        const requestDuration = Date.now() - requestStart;
        console.log(`      ⏱️  Request completed in ${requestDuration}ms`);

        // Log token usage if available
        if (response.usageMetadata) {
          const usage = response.usageMetadata;
          console.log(
            `      📊 Token Usage: ${usage.promptTokenCount} prompt + ${usage.candidatesTokenCount} completion = ${usage.totalTokenCount} total`
          );
        }

        // Check for safety ratings or blocks
        if (result.response.promptFeedback?.blockReason) {
          const blockReason = result.response.promptFeedback.blockReason;
          console.log(`      🚫 Response blocked: ${blockReason}`);
          throw new Error(`Gemini blocked the response due to: ${blockReason}`);
        }

        // Try to get text, handle errors
        let text: string;
        try {
          text = response.text();
        } catch (textError: any) {
          console.log(
            `      ⚠️  Failed to extract text from response: ${textError.message}`
          );
          console.log(
            `      📋 Response candidates:`,
            JSON.stringify(result.response.candidates, null, 2)
          );
          throw new Error(
            `Failed to extract text from Gemini response: ${textError.message}`
          );
        }

        if (!text || text.trim().length === 0) {
          console.log(`      ⚠️  Empty response received from Gemini`);
          console.log(
            `      📋 Full response:`,
            JSON.stringify(result.response, null, 2)
          );
          throw new Error(`Gemini returned an empty response`);
        }

        console.log(`      ✅ Received response (${text.length} chars)`);
        return text;
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error (429)
        if (
          error.message?.includes("429") ||
          error.message?.includes("RESOURCE_EXHAUSTED")
        ) {
          const waitTime = Math.pow(2, attempt) * GEMINI_RATE_LIMIT_BASE_WAIT_MS; // 10s, 20s, 40s
          console.log(
            `      🚫 Rate limited. Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}...`
          );
          await sleep(waitTime);
          continue;
        }

        // For other errors, log and retry
        console.log(
          `      ❌ Request failed: ${error.message}. Retrying (${attempt + 1}/${maxRetries})...`
        );
        await sleep(GEMINI_RETRY_WAIT_MS);
      }
    }

    // If we exhausted all retries
    throw (
      lastError ||
      new Error(`Gemini API call failed after ${maxRetries} retries`)
    );
  }

  /**
   * Call Gemini API and parse JSON response
   */
  async callGeminiJSON<T = any>(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      thinkingBudget?: number; // Limit thinking tokens to reserve space for output
      responseSchema?: GeminiSchema; // JSON schema for structured output
    }
  ): Promise<T> {
    const response = await this.callGemini(prompt, options);

    // If using structured output (responseSchema provided), response should be pure JSON
    if (options?.responseSchema) {
      try {
        return JSON.parse(response);
      } catch (error) {
        console.log(
          `      ⚠️  Failed to parse structured JSON response: ${error}`
        );
        // Fall through to fallback strategies
      }
    }

    // Strategy 1: Try code blocks first (most common format from Gemini)
    // Matches: ```json\n{...}\n``` or ```\n{...}\n``` or arrays
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        const extracted = codeBlockMatch[1].trim();
        if (extracted.startsWith("{") || extracted.startsWith("[")) {
          return JSON.parse(extracted);
        }
      } catch (error) {
        console.log(`      ⚠️  Failed to parse JSON from code block: ${error}`);
      }
    }

    // Strategy 2: Try to parse the entire response as JSON
    try {
      return JSON.parse(response);
    } catch (firstError) {
      // Response is not pure JSON, need to extract
    }

    // Strategy 3: Try to extract JSON from the response
    // Look for JSON object boundaries with non-greedy matching
    const jsonMatch = response.match(/\{[\s\S]*?\}(?=\s*$|\s*```|\s*\n\n)/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.log(`      ⚠️  Failed to parse extracted JSON: ${error}`);
      }
    }

    // Strategy 4: Find the last complete JSON object (greedy match)
    const greedyMatch = response.match(/\{[\s\S]*\}/);
    if (greedyMatch) {
      try {
        return JSON.parse(greedyMatch[0]);
      } catch (error) {
        console.log(`      ⚠️  Failed to parse greedy-matched JSON: ${error}`);
      }
    }

    // If all strategies fail, provide detailed error
    console.log(`      ❌ Could not parse JSON from response.`);
    console.log(`      📝 Response length: ${response.length} chars`);
    if (response.length > 0) {
      console.log(`      📝 First 500 chars: ${response.substring(0, 500)}`);
      if (response.length > 500) {
        console.log(
          `      📝 Last 200 chars: ${response.substring(response.length - 200)}`
        );
      }
    } else {
      console.log(`      📝 Response is empty!`);
    }
    throw new Error(
      `Failed to parse JSON from Gemini response. Tried multiple extraction strategies. Response length: ${response.length} chars`
    );
  }

  /**
   * Get current rate limit info
   */
  getRateLimitInfo(): { rpm: number; minIntervalSeconds: number } {
    return {
      rpm: Math.floor(MS_PER_MINUTE / this.minRequestInterval),
      minIntervalSeconds: this.minRequestInterval / 1000,
    };
  }
}
