import { Brain } from 'lucide-react';

const SCANNING_STEPS = [
  'Fetching file contents from repository...',
  'Scanning file contents for malicious code...',
  'Scanning file contents for suspicious dependencies...',
  'Scanning file contents for security risks...',
  'Scanning file contents for credential harvesting...',
  'Scanning file contents for system information gathering...',
  'Scanning file contents for network activity...',
  'Scanning file contents for file system activity...',
  'Scanning file contents for process activity...',
  'Generating security report...',
];

export const SCANNING_STEPS_COUNT = SCANNING_STEPS.length;

interface ScanningProgressProps {
  currentStep: number;
}

export function ScanningProgress({
  currentStep,
}: ScanningProgressProps): JSX.Element {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
      <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1">Scanning</p>
        <p className="text-sm text-muted-foreground">
          {SCANNING_STEPS[currentStep]}
        </p>
      </div>
    </div>
  );
}
