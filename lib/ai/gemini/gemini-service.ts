/**
 * Gemini Service - Google Gemini API Client
 *
 * This module provides a robust client for interacting with Google's Gemini AI API.
 * Handles rate limiting, retries, error recovery, and JSON response parsing.
 *
 * Key Features:
 * - Automatic rate limiting: Enforces minimum interval between requests
 * - Smart retries: Exponential backoff for rate limit errors (429), standard retry for others
 * - JSON parsing: Multiple fallback strategies to extract JSON from various response formats
 * - Structured output: Support for JSON schema-based responses
 * - Thinking budget: Configurable reasoning depth for Gemini 2.5 models
 * - Token tracking: Logs prompt, completion, and total token usage
 *
 * Rate Limiting Strategy:
 * - Minimum interval between requests (default: 1 second)
 * - Exponential backoff on 429 errors: 10s, 20s, 40s
 * - Configurable max retries (default: 3)
 *
 * @module lib/ai/gemini/gemini-service
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { sleep } from '@/lib/utils';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MIN_REQUEST_INTERVAL_MS,
  GEMINI_MAX_RETRIES,
  GEMINI_DEFAULT_TEMPERATURE,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_RATE_LIMIT_BASE_WAIT_MS,
  GEMINI_RETRY_WAIT_MS,
  MS_PER_MINUTE,
} from '@/lib/constants';
import type { GeminiServiceConfig, GeminiSchema } from '@/types/scan';

// Re-export SchemaType for use in workflow
export { SchemaType };

/**
 * Low-level client for Google Gemini API
 *
 * Provides rate-limited, retry-enabled access to Gemini models with automatic
 * error handling and response parsing.
 *
 * @class GeminiService
 *
 * @example
 * ```typescript
 * const service = new GeminiService({
 *   apiKey: process.env.GEMINI_API_KEY,
 *   model: 'gemini-2.5-flash-lite'
 * });
 *
 * // Simple text generation
 * const text = await service.callGemini('Explain quantum computing');
 *
 * // JSON response with schema
 * const result = await service.callGeminiJSON<{ answer: string }>(
 *   'What is 2+2? Return JSON with "answer" field',
 *   { responseSchema: mySchema }
 * );
 * ```
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = GEMINI_MIN_REQUEST_INTERVAL_MS;

  /**
   * Creates a new Gemini API client
   *
   * @param config - Configuration for the Gemini service
   * @param config.apiKey - Google Gemini API key
   * @param config.model - Optional model name (default: 'gemini-2.5-flash-lite')
   */
  constructor(config: GeminiServiceConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || DEFAULT_GEMINI_MODEL;
  }

  /**
   * Enforces rate limiting by waiting if necessary
   *
   * Ensures minimum time interval between API requests to comply with rate limits.
   * Automatically calculates and applies wait time if called too soon after last request.
   *
   * @returns Promise that resolves after any required wait time
   *
   * @example
   * ```typescript
   * await this.enforceRateLimit(); // Waits if needed
   * // Now safe to make API call
   * ```
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
   * Calls the Gemini API with a text prompt
   *
   * Main method for interacting with Gemini. Includes automatic rate limiting,
   * retry logic with exponential backoff, and comprehensive error handling.
   *
   * @param prompt - Text prompt to send to Gemini
   * @param options - Optional configuration for the API call
   * @param options.temperature - Sampling temperature (0-2, default: 1.0). Lower = more deterministic
   * @param options.maxTokens - Maximum output tokens (default: 65536 for Gemini 2.5 Flash Lite)
   * @param options.thinkingBudget - Token budget for reasoning (Gemini 2.5 feature). Set to 0 to disable
   * @param options.maxRetries - Maximum retry attempts (default: 3)
   * @param options.responseSchema - JSON schema for structured output (forces JSON response)
   * @returns Promise resolving to the text response from Gemini
   * @throws {Error} If all retry attempts fail or response is blocked/empty
   *
   * @example
   * ```typescript
   * // Simple text generation
   * const response = await service.callGemini('Explain quantum computing in simple terms');
   *
   * // With structured JSON output
   * const jsonResponse = await service.callGemini(
   *   'Analyze this code for security issues',
   *   {
   *     temperature: 0.7,
   *     thinkingBudget: 5000,
   *     responseSchema: myJsonSchema
   *   }
   * );
   * ```
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
              responseMimeType: 'application/json',
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
          error.message?.includes('429') ||
          error.message?.includes('RESOURCE_EXHAUSTED')
        ) {
          const waitTime =
            Math.pow(2, attempt) * GEMINI_RATE_LIMIT_BASE_WAIT_MS; // 10s, 20s, 40s
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
   * Calls Gemini API and parses the response as JSON
   *
   * Convenience wrapper around callGemini that automatically extracts and parses JSON
   * from the response. Uses multiple fallback strategies to handle various JSON formats:
   * 1. Parse as pure JSON (if responseSchema provided)
   * 2. Extract from markdown code blocks (```json ... ```)
   * 3. Parse entire response as JSON
   * 4. Extract JSON object with non-greedy matching
   * 5. Extract JSON object with greedy matching
   *
   * @template T - Type of the expected JSON response
   * @param prompt - Text prompt to send to Gemini
   * @param options - Optional configuration for the API call
   * @param options.temperature - Sampling temperature (0-2, default: 1.0)
   * @param options.maxTokens - Maximum output tokens
   * @param options.thinkingBudget - Token budget for reasoning (Gemini 2.5 feature)
   * @param options.responseSchema - JSON schema for structured output (recommended for reliable JSON)
   * @returns Promise resolving to parsed JSON object
   * @throws {Error} If JSON extraction fails with all strategies
   *
   * @example
   * ```typescript
   * interface SecurityAnalysis {
   *   safetyLevel: 'safe' | 'caution' | 'unsafe';
   *   findings: string[];
   * }
   *
   * const result = await service.callGeminiJSON<SecurityAnalysis>(
   *   'Analyze this code for security: ...',
   *   { responseSchema: securitySchema }
   * );
   *
   * console.log(result.safetyLevel); // Type-safe!
   * ```
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
        if (extracted.startsWith('{') || extracted.startsWith('[')) {
          return JSON.parse(extracted);
        }
      } catch (error) {
        console.log(`      ⚠️  Failed to parse JSON from code block: ${error}`);
      }
    }

    // Strategy 2: Try to parse the entire response as JSON
    try {
      return JSON.parse(response);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_firstError) {
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
   * Gets current rate limit configuration information
   *
   * Returns the calculated requests-per-minute (RPM) and minimum interval
   * between requests based on the configured rate limit settings.
   *
   * @returns Object containing rate limit metrics
   * @returns rpm - Maximum requests per minute
   * @returns minIntervalSeconds - Minimum seconds between requests
   *
   * @example
   * ```typescript
   * const info = service.getRateLimitInfo();
   * console.log(`Rate limit: ${info.rpm} requests/minute`);
   * console.log(`Min interval: ${info.minIntervalSeconds} seconds`);
   * // Example output: "Rate limit: 60 requests/minute, Min interval: 1 seconds"
   * ```
   */
  getRateLimitInfo(): { rpm: number; minIntervalSeconds: number } {
    return {
      rpm: Math.floor(MS_PER_MINUTE / this.minRequestInterval),
      minIntervalSeconds: this.minRequestInterval / 1000,
    };
  }
}
