import { Star } from 'lucide-react';

/**
 * Displays an informational callout for repositories trusted by star count
 * Indicates that full AI scanning was skipped due to community trust
 */
export function CommunityTrustCallout(): JSX.Element {
  return (
    <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
        <span className="font-semibold text-amber-700 dark:text-amber-400">
          Community Trusted Repository
        </span>
      </div>
      <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
        This repository was automatically marked as safe due to its high star
        count. Full AI-powered security scanning was not performed.
      </p>
    </div>
  );
}
