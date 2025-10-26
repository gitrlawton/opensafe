import { Star } from "lucide-react";

interface StarBadgeProps {
  stars: number;
  className?: string;
}

/**
 * Displays a star count badge for repositories
 * Shows star icon and formatted star count
 */
export function StarBadge({ stars, className = "" }: StarBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium ${className}`}
    >
      <Star className="h-3.5 w-3.5 fill-current" />
      {stars.toLocaleString()} stars
    </span>
  );
}
