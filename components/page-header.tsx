/**
 * PageHeader - Consistent page title and description
 */

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <div className={cn('mb-8', className)}>
      <h1 className="text-4xl font-bold mb-2 text-balance">{title}</h1>
      {description && (
        <p className="text-lg text-muted-foreground text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}
