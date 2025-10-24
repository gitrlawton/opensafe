import { cn } from "@/lib/utils";
import {
  mapSafetyScoreToUIType,
  getSeverityBackgroundColor,
  getSafetyScoreLabel,
} from "@/lib/ui-helpers";

interface SafetyBadgeProps {
  score: string | number; // Support both "SAFE"/"CAUTION"/"UNSAFE" and numeric scores
  className?: string;
}

/**
 * Displays a safety badge with color-coded styling based on safety score
 * Supports both string-based scores (SAFE/CAUTION/UNSAFE) and legacy numeric scores
 *
 * @param score - Safety score (string or number)
 * @param className - Optional additional CSS classes
 * @returns Safety badge component
 *
 * @example
 * <SafetyBadge score="SAFE" />
 * <SafetyBadge score={95} />
 */
export function SafetyBadge({
  score,
  className,
}: SafetyBadgeProps): JSX.Element {
  // Get the UI severity type based on score
  const uiType =
    typeof score === "string"
      ? mapSafetyScoreToUIType(score)
      : score >= 90
        ? "success"
        : score >= 70
          ? "warning"
          : "danger";

  const colorClasses = getSeverityBackgroundColor(uiType);
  const label = getSafetyScoreLabel(score);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "px-2.5 py-1 rounded-md text-xs font-medium border",
          colorClasses
        )}
      >
        {label}
      </span>
    </div>
  );
}
