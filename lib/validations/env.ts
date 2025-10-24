/**
 * Environment Variable Validation
 * Validates all required environment variables at runtime
 */

import { z } from "zod";

/**
 * Server-side environment variables schema
 */
export const serverEnvSchema = z.object({
  // Auth0 Configuration
  AUTH0_SECRET: z.string().min(32, "AUTH0_SECRET must be at least 32 characters"),
  AUTH0_BASE_URL: z.string().url("AUTH0_BASE_URL must be a valid URL"),
  AUTH0_ISSUER_BASE_URL: z.string().url("AUTH0_ISSUER_BASE_URL must be a valid URL"),
  AUTH0_CLIENT_ID: z.string().min(1, "AUTH0_CLIENT_ID is required"),
  AUTH0_CLIENT_SECRET: z.string().min(1, "AUTH0_CLIENT_SECRET is required"),

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
 * Client-side environment variables schema (public variables only)
 */
export const clientEnvSchema = z.object({
  // Next.js automatically exposes NEXT_PUBLIC_* variables to the client
  // Add any NEXT_PUBLIC_* variables here if needed
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validates server environment variables
 * Throws an error if validation fails with detailed messages
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
 * Validates client environment variables
 * Throws an error if validation fails with detailed messages
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
