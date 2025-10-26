import { Clock } from "lucide-react";

interface UnchangedRepoCalloutProps {
  lastScannedAt: string;
}

/**
 * Displays an informational callout for repositories that haven't changed since last scan
 * Indicates that cached results are being shown
 */
export function UnchangedRepoCallout({
  lastScannedAt,
}: UnchangedRepoCalloutProps): JSX.Element {
  const formattedDate = new Date(lastScannedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-5 w-5 text-blue-500" />
        <span className="font-semibold text-blue-700 dark:text-blue-400">
          Repository Unchanged Since Last Scan
        </span>
      </div>
      <p className="text-sm text-blue-700/80 dark:text-blue-400/80">
        There have been no changes to this repository since it was last scanned
        on <span className="font-medium">{formattedDate}</span>. Showing last
        scan results.
      </p>
    </div>
  );
}
