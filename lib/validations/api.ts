/**
 * API Request and Response Validation
 *
 * This module provides runtime validation and sanitization for all API requests and responses.
 * Uses Zod schemas for type-safe validation with clear error messages.
 *
 * Features:
 * - Request validation: Validates incoming API request data against schemas
 * - Response validation: Ensures API responses match expected formats
 * - Input sanitization: Removes potentially dangerous characters (XSS prevention)
 * - Error formatting: Converts Zod errors into user-friendly API responses
 *
 * Security:
 * - All string inputs are sanitized to prevent XSS and injection attacks
 * - URL validation ensures only valid GitHub repository URLs are accepted
 * - Maximum length limits prevent buffer overflow attacks
 * - Removes JavaScript protocols and event handlers
 *
 * @module lib/validations/api
 */

import { z } from 'zod';

/**
 * GitHub URL validation
 * Validates format: https://github.com/owner/repo
 */
export const githubUrlSchema = z
  .string()
  .url('Invalid URL format')
  .regex(
    /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/,
    'Invalid GitHub repository URL format. Expected: https://github.com/owner/repository'
  );

/**
 * Scan request validation
 */
export const scanRequestSchema = z.object({
  repoUrl: githubUrlSchema,
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;

/**
 * Finding severity validation
 */
export const findingSeveritySchema = z.enum(['low', 'moderate', 'severe']);

/**
 * Safety level validation
 */
export const safetyLevelSchema = z.enum(['safe', 'caution', 'unsafe']);

/**
 * Individual finding validation
 */
export const findingSchema = z.object({
  item: z.string().min(1, 'Item is required'),
  location: z.string().min(1, 'Location is required'),
  issue: z.string().min(1, 'Issue description is required'),
  severity: findingSeveritySchema,
  codeSnippet: z.string().optional(),
  batchId: z.number().optional(),
  dependencyUrl: z.string().url().optional(),
});

/**
 * Findings collection validation
 */
export const findingsSchema = z.object({
  maliciousCode: z.array(findingSchema),
  dependencies: z.array(findingSchema),
  networkActivity: z.array(findingSchema),
  fileSystemSafety: z.array(findingSchema),
  credentialSafety: z.array(findingSchema),
});

/**
 * Repository metadata validation
 */
export const repoMetadataSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string().min(1),
  language: z.string().optional(),
  description: z.string().optional(),
  stars: z.number().int().nonnegative().optional(),
});

/**
 * Scan result validation
 */
export const scanResultSchema = z.object({
  repoUrl: githubUrlSchema,
  repoMetadata: repoMetadataSchema.optional(),
  findings: findingsSchema,
  safetyLevel: safetyLevelSchema,
  aiSummary: z.string().min(1, 'AI summary is required'),
  scannedAt: z.string().datetime(),
  validated: z.boolean(),
  corrections: z.array(z.string()).optional(),
});

/**
 * Scan response validation
 */
export const scanResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  result: scanResultSchema.optional(),
});

export type ScanResponse = z.infer<typeof scanResponseSchema>;

/**
 * Repos query parameters validation
 */
export const reposQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().max(100).optional()),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().nonnegative().optional()),
  owner: z.string().optional(),
  language: z.string().optional(),
});

export type ReposQuery = z.infer<typeof reposQuerySchema>;

/**
 * Error response validation
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string().min(1),
  error: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      })
    )
    .optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Sanitizes a string to prevent XSS and injection attacks
 *
 * Security Measures:
 * - Trims whitespace
 * - Removes < and > characters to prevent HTML injection
 * - Removes javascript: protocol to prevent XSS
 * - Removes event handlers (onclick=, onload=, etc.)
 * - Limits length to 2000 characters to prevent buffer overflow
 *
 * @param input - Raw string input from user
 * @returns Sanitized string safe for database storage and display
 *
 * @example
 * ```typescript
 * sanitizeString("<script>alert('xss')</script>") // "scriptalert('xss')/script"
 * sanitizeString("javascript:alert(1)") // "alert(1)"
 * sanitizeString("<div onclick='evil()'>") // "div 'evil()'"
 * ```
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .slice(0, 2000); // Limit length
}

/**
 * Recursively sanitizes an object by sanitizing all string values
 *
 * Traverses the object tree and applies `sanitizeString` to every string property.
 * Handles nested objects recursively. Non-string values are left unchanged.
 *
 * @template T - Type of the object to sanitize
 * @param obj - Object containing potentially unsafe user input
 * @returns New object with all string values sanitized
 *
 * @example
 * ```typescript
 * const unsafe = {
 *   name: "<script>alert(1)</script>",
 *   nested: {
 *     url: "javascript:alert(1)"
 *   }
 * };
 * const safe = sanitizeObject(unsafe);
 * // { name: "scriptalert(1)/script", nested: { url: "alert(1)" } }
 * ```
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Validates and sanitizes request data in a single operation
 *
 * Two-step process:
 * 1. Validates data against Zod schema (type checking, format validation)
 * 2. Sanitizes all string values to prevent injection attacks
 *
 * This ensures data is both type-correct and security-safe before use.
 *
 * @template T - Expected type after validation
 * @param schema - Zod schema defining the expected structure and types
 * @param data - Raw, untrusted data from API request
 * @returns Validated and sanitized data matching the schema type
 * @throws {z.ZodError} If validation fails (invalid type, missing field, format error)
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string(), age: z.number() });
 * const result = validateAndSanitize(schema, { name: "<script>evil</script>", age: 25 });
 * // { name: "scriptevil/script", age: 25 }
 *
 * // Throws ZodError if validation fails
 * validateAndSanitize(schema, { name: "Bob" }); // Missing required field 'age'
 * ```
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const parsed = schema.parse(data);

  // Sanitize if it's an object with strings
  if (typeof parsed === 'object' && parsed !== null) {
    return sanitizeObject(parsed as any) as T;
  }

  return parsed;
}

/**
 * Converts a Zod validation error into a formatted API error response
 *
 * Transforms Zod's internal error format into a user-friendly API response
 * that clients can parse and display. Each validation error includes the
 * field path and error message.
 *
 * @param error - Zod error object from failed validation
 * @returns Formatted error response ready to send to client
 *
 * @example
 * ```typescript
 * try {
 *   schema.parse(invalidData);
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     return NextResponse.json(createValidationError(error), { status: 400 });
 *   }
 * }
 *
 * // Response format:
 * // {
 * //   success: false,
 * //   message: "Validation failed",
 * //   details: [
 * //     { field: "repoUrl", message: "Invalid GitHub repository URL format" },
 * //     { field: "userId", message: "Required" }
 * //   ]
 * // }
 * ```
 */
export function createValidationError(error: z.ZodError): ErrorResponse {
  return {
    success: false,
    message: 'Validation failed',
    details: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
