/**
 * Input validation schemas and utilities for API routes
 * Uses Zod for runtime type checking and validation
 */

import { z } from "zod";

/**
 * GitHub URL validation schema
 * Accepts various GitHub URL formats:
 * - https://github.com/owner/repo
 * - http://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
export const GitHubUrlSchema = z
  .string()
  .trim()
  .min(1, "Repository URL is required")
  .refine(
    (url) => {
      // Remove protocol and domain if present
      const cleaned = url
        .replace(/^https?:\/\//, "")
        .replace(/^github\.com\//, "");

      // Check if it matches owner/repo pattern
      const parts = cleaned.split("/");
      if (parts.length < 2) return false;

      const [owner, repo] = parts;

      // Validate owner and repo names
      // GitHub usernames: 1-39 chars, alphanumeric and hyphens, cannot start/end with hyphen
      // Repo names: similar rules
      const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
      const repoRegex = /^[a-zA-Z0-9._-]+$/;

      return (
        usernameRegex.test(owner) &&
        repoRegex.test(repo) &&
        owner.length <= 39 &&
        repo.length <= 100
      );
    },
    {
      message:
        "Invalid GitHub URL format. Expected: github.com/owner/repo or owner/repo",
    }
  );

/**
 * Scan request body schema
 */
export const ScanRequestSchema = z.object({
  repoUrl: GitHubUrlSchema,
});

/**
 * Query parameters for repos endpoint
 */
export const ReposQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(1000, "Limit cannot exceed 1000")
        .optional()
    ),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(0, "Offset must be non-negative").optional()),
  safetyScore: z
    .enum(["SAFE", "CAUTION", "UNSAFE"])
    .optional()
    .describe("Filter by safety score"),
});

/**
 * Sanitize a string to prevent XSS and injection attacks
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
    .slice(0, 2000); // Limit length
}

/**
 * Sanitize an object by sanitizing all string values
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize request body
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const parsed = schema.parse(data);

  // Sanitize if it's an object with strings
  if (typeof parsed === "object" && parsed !== null) {
    return sanitizeObject(parsed as any) as T;
  }

  return parsed;
}

/**
 * Type-safe error response creator for validation errors
 */
export function createValidationError(error: z.ZodError) {
  return {
    error: "Validation failed",
    details: error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    })),
  };
}
