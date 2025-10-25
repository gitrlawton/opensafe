/**
 * UI Helper Utilities
 * Shared utilities for UI display, styling, and formatting
 */

import type { FindingSeverity } from "@/types/scan";

/**
 * Type for visual severity levels used in UI
 */
export type UISeverity = "success" | "warning" | "danger" | "info";

/**
 * Icon type for UI severity
 */
export type SeverityIconType = "check" | "alert" | "info";

/**
 * Security finding category keys
 */
export type FindingCategoryKey =
  | "maliciousCode"
  | "dependencies"
  | "networkActivity"
  | "fileSystemSafety"
  | "credentialSafety";

/**
 * Maps finding severity to UI severity type
 * @param severity - Finding severity level
 * @returns UI severity type for styling
 *
 * @example
 * mapSeverityToUIType("severe") // "danger"
 * mapSeverityToUIType("moderate") // "warning"
 * mapSeverityToUIType("low") // "warning"
 */
export function mapSeverityToUIType(severity: FindingSeverity): UISeverity {
  switch (severity) {
    case "severe":
      return "danger";
    case "moderate":
    case "low":
      return "warning";
    default:
      return "warning";
  }
}

/**
 * Gets the icon type for a UI severity
 * @param type - UI severity type
 * @returns Icon type identifier
 *
 * @example
 * getSeverityIconType("success") // "check"
 * getSeverityIconType("danger") // "alert"
 */
export function getSeverityIconType(type: UISeverity): SeverityIconType {
  switch (type) {
    case "success":
      return "check";
    case "warning":
    case "danger":
      return "alert";
    default:
      return "info";
  }
}

/**
 * Gets the icon color class for a UI severity type
 * @param type - UI severity type
 * @returns Tailwind CSS color class
 *
 * @example
 * getSeverityIconColor("success") // "text-success"
 * getSeverityIconColor("danger") // "text-danger"
 */
export function getSeverityIconColor(type: UISeverity): string {
  switch (type) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "danger":
      return "text-danger";
    default:
      return "text-primary";
  }
}

/**
 * Gets the border color Tailwind class for a UI severity type
 * @param type - UI severity type
 * @returns Tailwind CSS class string
 *
 * @example
 * getSeverityBorderColor("danger") // "border-l-danger"
 */
export function getSeverityBorderColor(type: UISeverity): string {
  switch (type) {
    case "success":
      return "border-l-success";
    case "warning":
      return "border-l-warning";
    case "danger":
      return "border-l-danger";
    default:
      return "border-l-primary";
  }
}

/**
 * Gets the badge color Tailwind classes for a UI severity type
 * @param type - UI severity type
 * @returns Tailwind CSS class string
 *
 * @example
 * getSeverityBadgeColor("danger") // "bg-danger/20 text-danger"
 */
export function getSeverityBadgeColor(type: UISeverity): string {
  switch (type) {
    case "success":
      return "bg-success/20 text-success";
    case "warning":
      return "bg-warning/20 text-warning";
    case "danger":
      return "bg-danger/20 text-danger";
    default:
      return "bg-primary/20 text-primary";
  }
}

/**
 * Gets the background color Tailwind classes for a UI severity type
 * @param type - UI severity type
 * @returns Tailwind CSS class string with border variant
 *
 * @example
 * getSeverityBackgroundColor("success") // "bg-success/10 text-success border-success/20"
 */
export function getSeverityBackgroundColor(type: UISeverity): string {
  switch (type) {
    case "success":
      return "bg-success/10 text-success border-success/20";
    case "warning":
      return "bg-warning/10 text-warning border-warning/20";
    case "danger":
      return "bg-danger/10 text-danger border-danger/20";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

/**
 * Category configuration mapping
 */
const CATEGORY_CONFIG: Record<
  FindingCategoryKey,
  {
    title: string;
    description: string;
  }
> = {
  maliciousCode: {
    title: "Malicious Code Issues",
    description: "No malicious code patterns detected",
  },
  dependencies: {
    title: "Dependency Issues",
    description: "All dependencies appear safe",
  },
  networkActivity: {
    title: "Network Activity Issues",
    description: "No suspicious network activity detected",
  },
  fileSystemSafety: {
    title: "File System Issues",
    description: "No dangerous file system operations detected",
  },
  credentialSafety: {
    title: "Credential Safety Issues",
    description: "No credential leaks or unsafe credential handling detected",
  },
};

/**
 * Gets the display title for a finding category
 * @param categoryKey - Category key
 * @returns Human-readable category title
 *
 * @example
 * getCategoryTitle("maliciousCode") // "Malicious Code Issues"
 */
export function getCategoryTitle(categoryKey: string): string {
  return (
    CATEGORY_CONFIG[categoryKey as FindingCategoryKey]?.title ||
    "Unknown Issues"
  );
}

/**
 * Gets the description for a finding category
 * @param categoryKey - Category key
 * @returns Human-readable category description (for success state)
 *
 * @example
 * getCategoryDescription("dependencies") // "All dependencies appear safe"
 */
export function getCategoryDescription(categoryKey: string): string {
  return (
    CATEGORY_CONFIG[categoryKey as FindingCategoryKey]?.description ||
    "No issues detected"
  );
}

/**
 * Maps safety score string to UI severity
 * @param score - Safety score ("SAFE", "CAUTION", "UNSAFE")
 * @returns UI severity type
 *
 * @example
 * mapSafetyScoreToUIType("SAFE") // "success"
 * mapSafetyScoreToUIType("UNSAFE") // "danger"
 */
export function mapSafetyScoreToUIType(score: string): UISeverity {
  const scoreUpper = score.toUpperCase();
  if (scoreUpper === "SAFE") return "success";
  if (scoreUpper === "CAUTION") return "warning";
  return "danger"; // UNSAFE
}

/**
 * Gets display label for safety score
 * @param score - Safety score string or number
 * @returns Human-readable label
 *
 * @example
 * getSafetyScoreLabel("SAFE") // "Safe"
 * getSafetyScoreLabel(95) // "Safe"
 */
export function getSafetyScoreLabel(score: string | number): string {
  if (typeof score === "string") {
    const scoreUpper = score.toUpperCase();
    if (scoreUpper === "SAFE") return "Safe";
    if (scoreUpper === "CAUTION") return "Caution";
    return "Unsafe";
  }

  // Numeric scores (legacy format)
  if (score >= 90) return "Safe";
  if (score >= 70) return "Caution";
  return "Unsafe";
}
