import { cn } from "@/lib/utils"

interface SafetyBadgeProps {
  score: string | number // Support both "SAFE"/"CAUTION"/"UNSAFE" and numeric scores
  className?: string
}

export function SafetyBadge({ score, className }: SafetyBadgeProps) {
  // Handle string scores from Snowflake
  if (typeof score === "string") {
    const scoreUpper = score.toUpperCase()
    const getColorForString = () => {
      if (scoreUpper === "SAFE") return "bg-success/10 text-success border-success/20"
      if (scoreUpper === "CAUTION") return "bg-warning/10 text-warning border-warning/20"
      return "bg-danger/10 text-danger border-danger/20" // UNSAFE
    }

    const getDisplayLabel = () => {
      if (scoreUpper === "SAFE") return "Safe"
      if (scoreUpper === "CAUTION") return "Caution"
      return "Unsafe"
    }

    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border", getColorForString())}>
          {getDisplayLabel()}
        </span>
      </div>
    )
  }

  // Handle numeric scores (legacy format)
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-success/10 text-success border-success/20"
    if (score >= 70) return "bg-warning/10 text-warning border-warning/20"
    return "bg-danger/10 text-danger border-danger/20"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Safe"
    if (score >= 70) return "Caution"
    return "Risk"
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border", getScoreColor(score))}>
        {getScoreLabel(score)}
      </span>
      <span className="text-sm font-mono text-muted-foreground">{score}/100</span>
    </div>
  )
}
