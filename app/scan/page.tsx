'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { parseGitHubUrl, isValidGitHubUrl, buildRepoUrl } from '@/lib/utils';
import { Loader2, Github } from 'lucide-react';
import { ScanningProgress, SCANNING_STEPS_COUNT } from './scanning-progress';
import { PageLayout, PageContainer } from '@/components/page-layout';
import { PageHeader } from '@/components/page-header';
import { ErrorMessage, SuccessMessage } from '@/components/ui-states';

function ScanPage(): JSX.Element {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < SCANNING_STEPS_COUNT - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 600); // Change step every 600ms

    return () => clearInterval(interval);
  }, [isScanning]);

  const handleScan = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsScanning(true);
    setScanComplete(false);
    setScanError(null);
    setCurrentStep(0);

    if (!isValidGitHubUrl(repoUrl)) {
      setScanError('Invalid GitHub repository URL');
      setIsScanning(false);
      return;
    }

    const { owner, repo: cleanRepo } = parseGitHubUrl(repoUrl);

    try {
      // Call the real Gemini scan API
      const response = await fetch('/api/scan-gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Scan failed');
      }

      const result = await response.json();

      setIsScanning(false);
      setScanComplete(true);

      // Redirect to results page after a short delay
      setTimeout(() => {
        const url = buildRepoUrl(owner, cleanRepo, result);
        router.push(url);
      }, 1500);
    } catch (error: any) {
      console.error('Scan error:', error);
      setScanError(error.message || 'An error occurred during scanning');
      setIsScanning(false);
    }
  };

  return (
    <PageLayout className="flex items-start justify-center pt-32">
      <PageContainer maxWidth="2xl">
        <PageHeader
          title="Scan New Repository"
          description="Submit a GitHub repository URL to scan for malicious code, suspicious dependencies, and security threats."
        />

        <Card>
          <CardHeader>
            <CardTitle>Repository URL</CardTitle>
            <CardDescription>
              Enter the full GitHub repository URL (e.g.,
              https://github.com/owner/repository)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="repo-url">GitHub Repository</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="repo-url"
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="pl-9"
                    required
                    disabled={isScanning}
                  />
                </div>
              </div>

              {isScanning && <ScanningProgress currentStep={currentStep} />}

              {scanComplete && !isScanning && (
                <SuccessMessage message="Scan complete! Redirecting to results..." />
              )}

              {scanError && !isScanning && <ErrorMessage message={scanError} />}

              <Button
                type="submit"
                disabled={isScanning || !repoUrl}
                className="w-full cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning Repository...
                  </>
                ) : (
                  'Start Scan'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </PageLayout>
  );
}

export default withPageAuthRequired(ScanPage);
