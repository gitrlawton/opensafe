/**
 * UI State Components - Consistent loading, error, success, and empty states
 */

import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingSpinner - Centered loading state with spinner
 */
interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({
  message,
  className,
}: LoadingSpinnerProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 gap-3',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

/**
 * ErrorMessage - Error state with alert icon
 */
interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({
  message,
  className,
}: ErrorMessageProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20',
        className
      )}
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

/**
 * SuccessMessage - Success state with check icon
 */
interface SuccessMessageProps {
  message: string;
  className?: string;
}

export function SuccessMessage({
  message,
  className,
}: SuccessMessageProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-4 rounded-lg bg-success/10 text-success border border-success/20',
        className
      )}
    >
      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

/**
 * EmptyState - Empty state with optional icon and action
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      {title && (
        <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      )}
      <p className="text-muted-foreground mb-4">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
