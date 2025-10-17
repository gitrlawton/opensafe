import { cn } from "@/lib/utils"

interface SafetyBadgeProps {
  score: number
  className?: string
}

export function SafetyBadge({ score, className }: SafetyBadgeProps) {
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
