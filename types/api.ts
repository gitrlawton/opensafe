/**
 * API Type Definitions
 * Shared types for API request/response handling
 */

import type { SafetyScore } from "./scan";

/**
 * Scanned repository (frontend format)
 */
export interface ScannedRepo {
  id: string;
  name: string;
  owner: string;
  language: string;
  safetyScore: string | number; // Support both "SAFE"/"CAUTION"/"UNSAFE" and numeric scores
  lastScanned: string;
  scannedBy?: string;
}

/**
 * Scan request body
 */
export interface ScanRequest {
  repoUrl: string;
}

/**
 * Repository query parameters
 */
export interface ReposQueryParams {
  limit?: number;
  offset?: number;
  safetyScore?: SafetyScore;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse {
  error: string;
  details: ValidationErrorDetail[];
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
}

/**
 * User session data
 */
export interface UserSession {
  user: {
    name?: string;
    email?: string;
    picture?: string;
  };
}

/**
 * Page props with dynamic params (Next.js)
 */
export interface PageProps<T = Record<string, string>> {
  params: Promise<T>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}
