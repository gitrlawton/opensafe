/**
 * Loading state for repository detail page
 * Automatically displayed by Next.js when the page is loading
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLayout, PageContainer } from "@/components/page-layout";
import { BackLink } from "@/components/back-link";

export default function Loading(): JSX.Element {
  return (
    <PageLayout>
      <PageContainer maxWidth="4xl">
        <BackLink href="/" label="Back to all repositories" />

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {/* Title skeleton */}
              <Skeleton className="h-10 w-64 mb-2" />
              <div className="flex items-center gap-4">
                {/* Language badge skeleton */}
                <Skeleton className="h-6 w-24" />
                {/* Last scanned skeleton */}
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            {/* Safety badge skeleton */}
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Analysis Summary Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>

          {/* Security Findings Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-4 rounded-lg border bg-muted/30"
                  >
                    <Skeleton className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contributor Notes Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
