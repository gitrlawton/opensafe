import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  MS_PER_MINUTE,
  TIME_DISPLAY_MINUTES_THRESHOLD,
  TIME_DISPLAY_HOURS_THRESHOLD,
  TIME_DISPLAY_DAYS_THRESHOLD,
} from "./constants";

/**
 * Merges Tailwind CSS classes with proper deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Async sleep utility for rate limiting and delays
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formats a timestamp into a human-readable relative time string
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted time string (e.g., "2 hours ago", "Just now")
 *
 * @example
 * formatTimestamp("2025-01-19T08:23:31.000Z") // "2 hours ago"
 * formatTimestamp(new Date()) // "Just now"
 */
export function formatTimestamp(timestamp: string | Date): string {
  if (!timestamp) return "Unknown";

  const scanned = new Date(timestamp);

  // Check if the date is valid
  if (isNaN(scanned.getTime())) {
    console.error("Invalid timestamp:", timestamp);
    return "Unknown";
  }

  const now = new Date();
  const diffMs = now.getTime() - scanned.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMins / TIME_DISPLAY_MINUTES_THRESHOLD);
  const diffDays = Math.floor(diffHours / TIME_DISPLAY_HOURS_THRESHOLD);

  if (diffMins < 1) return "Just now";
  if (diffMins < TIME_DISPLAY_MINUTES_THRESHOLD)
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < TIME_DISPLAY_HOURS_THRESHOLD)
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < TIME_DISPLAY_DAYS_THRESHOLD)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return scanned.toLocaleDateString();
}

/**
 * Maps scan result safety level to database format
 * @param safetyLevel - Safety level from scan ("safe", "caution", "unsafe")
 * @returns Database-compatible safety score ("SAFE", "CAUTION", "UNSAFE")
 *
 * @example
 * mapSafetyLevelToScore("safe") // "SAFE"
 * mapSafetyLevelToScore("unknown") // "CAUTION" (default)
 */
export function mapSafetyLevelToScore(
  safetyLevel: string
): "SAFE" | "CAUTION" | "UNSAFE" {
  const safetyScoreMap: Record<string, "SAFE" | "CAUTION" | "UNSAFE"> = {
    safe: "SAFE",
    caution: "CAUTION",
    unsafe: "UNSAFE",
  };
  return safetyScoreMap[safetyLevel] || "CAUTION";
}

/**
 * Parses a GitHub repository URL to extract owner and repository name
 * Supports formats:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - https://github.com/owner/repo.git
 *
 * @param url - GitHub repository URL
 * @returns Object with owner and repo name (with .git suffix removed)
 * @throws {Error} If URL format is invalid
 *
 * @example
 * parseGitHubUrl("https://github.com/gitrlawton/test-repo")
 * // { owner: "gitrlawton", repo: "test-repo" }
 *
 * parseGitHubUrl("github.com/gitrlawton/test-repo.git")
 * // { owner: "gitrlawton", repo: "test-repo" }
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

/**
 * Validates if a string is a valid GitHub repository URL
 * Supports formats:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 *
 * @param url - URL string to validate
 * @returns true if valid GitHub URL, false otherwise
 *
 * @example
 * isValidGitHubUrl("https://github.com/owner/repo") // true
 * isValidGitHubUrl("github.com/owner/repo") // true
 * isValidGitHubUrl("https://gitlab.com/owner/repo") // false
 */
export function isValidGitHubUrl(url: string): boolean {
  return /github\.com\/([^\/]+)\/([^\/]+)/.test(url);
}

/**
 * Extracts error message from various error types
 * Handles Error objects, strings, and unknown error types
 *
 * @param error - Error of any type
 * @param fallback - Fallback message if no message can be extracted
 * @returns Error message string
 *
 * @example
 * getErrorMessage(new Error("Failed")) // "Failed"
 * getErrorMessage("Something went wrong") // "Something went wrong"
 * getErrorMessage(null, "Unknown error") // "Unknown error"
 */
export function getErrorMessage(error: unknown, fallback = "Unknown error occurred"): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return fallback;
}

/**
 * Creates a standardized API error response object
 * Used for consistent error formatting across API routes
 *
 * @param error - Error message or error object
 * @param details - Additional error details (optional)
 * @returns Standardized error response object
 *
 * @example
 * createApiError("Invalid input")
 * // { error: "Invalid input", message: "Invalid input" }
 *
 * createApiError("Failed to process", "Missing required field: email")
 * // { error: "Failed to process", message: "Failed to process", details: "Missing required field: email" }
 */
export function createApiError(error: string | Error, details?: string): {
  error: string;
  message: string;
  details?: string;
} {
  const message = typeof error === "string" ? error : error.message;
  const response: { error: string; message: string; details?: string } = {
    error: message,
    message,
  };
  if (details) {
    response.details = details;
  }
  return response;
}

/**
 * Logs error with consistent formatting and context
 * Includes timestamp and context prefix
 *
 * @param context - Context string (e.g., "[API]", "[Scan]")
 * @param message - Error message
 * @param error - Optional error object for additional details
 *
 * @example
 * logError("[API]", "Failed to fetch repos", error)
 * // Console: "[API] Failed to fetch repos: Error message"
 */
export function logError(context: string, message: string, error?: unknown): void {
  const errorMessage = error ? getErrorMessage(error) : "";
  const fullMessage = errorMessage ? `${message}: ${errorMessage}` : message;
  console.error(`${context} ${fullMessage}`);

  // Log full error object if it's an Error with stack trace
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
}
