/**
 * Application-Wide Constants
 *
 * This module centralizes all magic numbers, configuration values, and thresholds
 * used throughout the application. Prevents code duplication and makes tuning easier.
 *
 * Categories:
 * - Time Constants: Conversions and display thresholds
 * - Gemini API Constants: Model settings, rate limits, token budgets
 * - Scan Workflow Constants: Batch sizes, trust thresholds
 * - URL Query Parameters: Standardized query param keys
 * - Time Display Constants: Formatting thresholds for relative time
 *
 * Best Practices:
 * - All constants are exported for easy imports
 * - Each constant includes inline documentation
 * - Organized by logical grouping with visual section separators
 *
 * @module lib/constants
 */

// ============================================================================
// Time Constants
// ============================================================================

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60000;

/** Seconds in one minute */
export const SECONDS_PER_MINUTE = 60;

// ============================================================================
// Gemini API Constants
// ============================================================================

/** Default Gemini model to use for scans */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** Minimum interval between Gemini API requests (6 seconds = 10 RPM) */
export const GEMINI_MIN_REQUEST_INTERVAL_MS = 6000;

/** Default number of retries for failed API calls */
export const GEMINI_MAX_RETRIES = 3;

/** Default temperature for Gemini API calls (lower = more deterministic) */
export const GEMINI_DEFAULT_TEMPERATURE = 0.3;

/** Temperature for risk detection analysis */
export const GEMINI_RISK_DETECTION_TEMPERATURE = 0.2;

/** Temperature for safety level calculation (very low for consistency) */
export const GEMINI_SAFETY_LEVEL_TEMPERATURE = 0.1;

/** Maximum output tokens for Gemini (65,536 for Gemini 2.5 Flash Lite) */
export const GEMINI_MAX_OUTPUT_TOKENS = 65536;

/** Thinking budget for risk detection (tokens reserved for thinking) */
export const GEMINI_RISK_DETECTION_THINKING_BUDGET = 8000;

/** Maximum tokens for safety level calculation */
export const GEMINI_SAFETY_LEVEL_MAX_TOKENS = 32768;

/** Base wait time for exponential backoff on rate limit (10 seconds) */
export const GEMINI_RATE_LIMIT_BASE_WAIT_MS = 10000;

/** Wait time between retries for general errors (2 seconds) */
export const GEMINI_RETRY_WAIT_MS = 2000;

// ============================================================================
// Scan Workflow Constants
// ============================================================================

/** Number of files to process per batch during risk detection */
export const SCAN_BATCH_SIZE = 5;

/** Maximum number of repositories to fetch from database */
export const MAX_REPOS_FETCH_LIMIT = 100;

/** Star count threshold for automatically trusting repositories (1000+ stars) */
export const TRUSTED_REPO_STAR_THRESHOLD = 1000;

// ============================================================================
// URL Query Parameter Constants
// ============================================================================

/** Query parameter key for unchanged repository flag */
export const QUERY_PARAM_UNCHANGED = "unchanged";

/** Query parameter key for trusted repository flag */
export const QUERY_PARAM_TRUSTED = "trusted";

// ============================================================================
// Time Display Constants
// ============================================================================

/** Minutes threshold for showing "X minutes ago" */
export const TIME_DISPLAY_MINUTES_THRESHOLD = 60;

/** Hours threshold for showing "X hours ago" */
export const TIME_DISPLAY_HOURS_THRESHOLD = 24;

/** Days threshold for showing "X days ago" (after 7 days, show weeks) */
export const TIME_DISPLAY_DAYS_THRESHOLD = 7;

/** Days in a week (7) */
export const DAYS_PER_WEEK = 7;

/** Weeks threshold for showing "X weeks ago" (after 3 weeks, show months) */
export const TIME_DISPLAY_WEEKS_THRESHOLD = 3;

/** Days in a month (approximate - 30.44 days average) */
export const DAYS_PER_MONTH = 30.44;

/** Months threshold for showing "X months ago" (after 11 months, show years) */
export const TIME_DISPLAY_MONTHS_THRESHOLD = 11;

/** Days in a year (approximate - 365.25 for leap years) */
export const DAYS_PER_YEAR = 365.25;
