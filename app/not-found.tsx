/**
 * 404 Not Found page
 * Displayed when a user navigates to a non-existent route
 */

import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageLayout, PageContainer } from '@/components/page-layout';
import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <PageLayout>
      <PageContainer
        maxWidth="2xl"
        className="flex items-center justify-center min-h-[calc(100vh-200px)]"
      >
        <Card className="w-full text-center border-none shadow-none">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <SearchX className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl">Page Not Found</CardTitle>
            <CardDescription className="text-base">
              The page you're looking for doesn't exist or has been moved.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    </PageLayout>
  );
}
