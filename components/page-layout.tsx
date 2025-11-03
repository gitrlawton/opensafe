/**
 * PageLayout - Consistent page wrapper for all app pages
 * Provides standard background and min-height styling
 */

import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  children,
  className,
}: PageLayoutProps): JSX.Element {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {children}
    </div>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
}

export function PageContainer({
  children,
  className,
  maxWidth = 'full',
}: PageContainerProps): JSX.Element {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: '',
  };

  return (
    <main
      className={cn(
        'container mx-auto px-4 py-12',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </main>
  );
}
