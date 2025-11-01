/**
 * Environment Variable Validation
 *
 * This module provides runtime validation for all environment variables using Zod schemas.
 * Ensures all required configuration is present before the application starts.
 *
 * Features:
 * - Type-safe environment variable access
 * - Validation with clear error messages
 * - Separate schemas for server-side and client-side variables
 * - Enforces minimum lengths and formats for security-critical values
 *
 * Usage:
 * - Call validateServerEnv() at application startup (server-side only)
 * - Call validateClientEnv() for client-side validation (currently no public vars)
 * - Application will fail fast with descriptive errors if validation fails
 *
 * @module lib/validations/env
 */

import { z } from "zod";

/**
 * Zod schema for server-side environment variables
 *
 * Validates all environment variables required for server-side operations.
 * Enforces minimum security requirements (e.g., AUTH0_SECRET must be 32+ chars).
 *
 * Required Variables:
 * - Auth0: AUTH0_SECRET, APP_BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
 * - APIs: GEMINI_API_KEY (GITHUB_TOKEN is optional)
 * - Snowflake: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD, etc.
 * - Optional: NODE_ENV, GEMINI_MODEL
 */
export const serverEnvSchema = z.object({
  // Auth0 Configuration
  AUTH0_SECRET: z.string().min(32, "AUTH0_SECRET must be at least 32 characters"),
  APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL"),
  AUTH0_DOMAIN: z.string().min(1, "AUTH0_DOMAIN is required"),
  AUTH0_CLIENT_ID: z.string().min(1, "AUTH0_CLIENT_ID is required"),
  AUTH0_CLIENT_SECRET: z.string().min(1, "AUTH0_CLIENT_SECRET is required"),
  AUTH0_SCOPE: z.string().optional(),

  // API Keys
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GITHUB_TOKEN: z.string().optional(),

  // Snowflake Configuration
  SNOWFLAKE_ACCOUNT: z.string().min(1, "SNOWFLAKE_ACCOUNT is required"),
  SNOWFLAKE_USERNAME: z.string().min(1, "SNOWFLAKE_USERNAME is required"),
  SNOWFLAKE_PASSWORD: z.string().min(1, "SNOWFLAKE_PASSWORD is required"),
  SNOWFLAKE_DATABASE: z.string().min(1, "SNOWFLAKE_DATABASE is required"),
  SNOWFLAKE_SCHEMA: z.string().min(1, "SNOWFLAKE_SCHEMA is required"),
  SNOWFLAKE_WAREHOUSE: z.string().min(1, "SNOWFLAKE_WAREHOUSE is required"),

  // Optional Configuration
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  GEMINI_MODEL: z.string().optional(),
});

/**
 * Zod schema for client-side environment variables
 *
 * Validates environment variables that are safe to expose to the browser.
 * Only NEXT_PUBLIC_* variables should be added here.
 *
 * Note: Currently no public environment variables are needed.
 * If adding public vars, they must be prefixed with NEXT_PUBLIC_.
 */
export const clientEnvSchema = z.object({
  // Next.js automatically exposes NEXT_PUBLIC_* variables to the client
  // Add any NEXT_PUBLIC_* variables here if needed
});

/**
 * TypeScript type derived from server environment schema
 * Provides type-safe access to validated environment variables
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * TypeScript type derived from client environment schema
 * Provides type-safe access to public environment variables
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validates server-side environment variables
 *
 * Parses and validates all required server environment variables using Zod.
 * Should be called at application startup to fail fast if configuration is missing.
 *
 * @returns Validated and typed environment variables object
 * @throws {Error} If validation fails, with detailed error messages for each invalid variable
 *
 * @example
 * ```typescript
 * // In server-side initialization code
 * const env = validateServerEnv();
 * console.log(env.GEMINI_API_KEY); // Type-safe access
 * ```
 */
export function validateServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.format();
    const errorMessages = Object.entries(errors)
      .filter(([key]) => key !== "_errors")
      .map(([key, value]: [string, any]) => {
        const messages = value?._errors || [];
        return `  - ${key}: ${messages.join(", ")}`;
      })
      .join("\n");

    throw new Error(
      `Invalid environment variables:\n${errorMessages}\n\nPlease check your .env.local file.`
    );
  }

  return parsed.data;
}

/**
 * Validates client-side environment variables
 *
 * Parses and validates public environment variables that are safe to expose to the browser.
 * Currently validates an empty schema since no public variables are used.
 *
 * @returns Validated and typed public environment variables object
 * @throws {Error} If validation fails, with detailed error messages for each invalid variable
 *
 * @example
 * ```typescript
 * // In client-side code
 * const env = validateClientEnv();
 * // Currently returns empty object
 * ```
 */
export function validateClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.format();
    const errorMessages = Object.entries(errors)
      .filter(([key]) => key !== "_errors")
      .map(([key, value]: [string, any]) => {
        const messages = value?._errors || [];
        return `  - ${key}: ${messages.join(", ")}`;
      })
      .join("\n");

    throw new Error(
      `Invalid client environment variables:\n${errorMessages}`
    );
  }

  return parsed.data;
}
