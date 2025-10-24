/**
 * API Request and Response Validation Schemas
 * Using Zod for runtime type validation
 */

import { z } from "zod";

/**
 * GitHub URL validation
 * Validates format: https://github.com/owner/repo
 */
export const githubUrlSchema = z
  .string()
  .url("Invalid URL format")
  .regex(
    /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/,
    "Invalid GitHub repository URL format. Expected: https://github.com/owner/repository"
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
export const findingSeveritySchema = z.enum(["low", "moderate", "severe"]);

/**
 * Safety level validation
 */
export const safetyLevelSchema = z.enum(["safe", "caution", "unsafe"]);

/**
 * Individual finding validation
 */
export const findingSchema = z.object({
  item: z.string().min(1, "Item is required"),
  location: z.string().min(1, "Location is required"),
  issue: z.string().min(1, "Issue description is required"),
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
  aiSummary: z.string().min(1, "AI summary is required"),
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
 * Sanitize a string to prevent XSS and injection attacks
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
 * Validate and sanitize request data
 * @throws {z.ZodError} if validation fails
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
 * Create a formatted validation error response from Zod error
 */
export function createValidationError(error: z.ZodError): ErrorResponse {
  return {
    success: false,
    message: "Validation failed",
    details: error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    })),
  };
}
