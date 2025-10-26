import Link from "next/link";
import { SafetyBadge } from "@/components/safety-badge";
import { StarBadge } from "@/components/star-badge";
import { CommunityTrustCallout } from "@/components/community-trust-callout";
import { UnchangedRepoCallout } from "@/components/unchanged-repo-callout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth0 } from "@/lib/auth0";
import { getRepoByOwnerAndName } from "@/lib/database/snowflake";
import { RescanButton } from "./rescan-button";
import { ContributorNotes } from "./contributor-notes";
import { formatTimestamp } from "@/lib/utils";
import { QUERY_PARAM_UNCHANGED, QUERY_PARAM_TRUSTED } from "@/lib/constants";
import { PageLayout, PageContainer } from "@/components/page-layout";
import { BackLink } from "@/components/back-link";
import { SecurityCategory } from "./security-findings";
import type { PageProps } from "@/types/api";
import type { Findings } from "@/types/scan";

type RepoPageProps = PageProps<{
  owner: string;
  name: string;
}>;

export default async function RepoDetailPage({ params, searchParams }: RepoPageProps): Promise<JSX.Element> {
  const { owner, name } = await params;
  const query = await searchParams;

  // Check for special query parameters from scan
  const isUnchangedScan = query?.[QUERY_PARAM_UNCHANGED] === "true";
  const isTrustedScan = query?.[QUERY_PARAM_TRUSTED] === "true";

  // Get authentication status
  const session = await auth0.getSession();
  const isLoggedIn = !!session?.user;

  // Fetch repo data from Snowflake
  const repoData = await getRepoByOwnerAndName(owner, name);

  // If no data found, show not found message
  if (!repoData) {
    return (
      <PageLayout>
        <PageContainer maxWidth="4xl">
          <BackLink href="/" label="Back to all repositories" />
          <Card>
            <CardHeader>
              <CardTitle>Repository Not Found</CardTitle>
              <CardDescription>
                {owner}/{name} has not been scanned yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This repository hasn't been scanned yet. Scan it to see detailed
                security analysis.
              </p>
              <Link href="/scan">
                <Button>Scan This Repository</Button>
              </Link>
            </CardContent>
          </Card>
        </PageContainer>
      </PageLayout>
    );
  }

  // Parse the findings JSON
  const findings = repoData.FINDINGS;

  // Define security categories
  const securityCategories = [
    {
      key: "maliciousCode",
      title: "No Malicious Code Detected",
      description:
        "Code analysis found no obfuscated code, crypto miners, keyloggers, or backdoor patterns.",
    },
    {
      key: "dependencies",
      title: "Dependencies Verified",
      description:
        "All dependencies are from trusted sources with no known vulnerabilities or suspicious install scripts.",
    },
    {
      key: "networkActivity",
      title: "No Suspicious Network Activity",
      description:
        "No unauthorized network calls, data exfiltration attempts, or connections to unknown domains detected.",
    },
    {
      key: "fileSystemSafety",
      title: "File System Operations Safe",
      description:
        "No unsafe file operations, suspicious file access patterns, or unauthorized file modifications detected.",
    },
    {
      key: "credentialSafety",
      title: "Credential Safety Verified",
      description:
        "No credential harvesting, exposed secrets, or authentication vulnerabilities detected.",
    },
  ];

  return (
    <PageLayout>
      <PageContainer maxWidth="4xl">
        <BackLink href="/" label="Back to all repositories" />

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-balance">
                {owner}/{name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                  {repoData.LANGUAGE || "Unknown"}
                </span>
                <span>Last scanned {formatTimestamp(repoData.SCANNED_AT)}</span>
                {(isTrustedScan || findings.trustedByStar) && findings.repoMetadata?.stars && (
                  <StarBadge stars={findings.repoMetadata.stars} />
                )}
              </div>
            </div>
            <SafetyBadge score={repoData.SAFETY_SCORE} />
          </div>

          {isLoggedIn && <RescanButton owner={owner} name={name} />}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>
                Automated security and safety assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(isTrustedScan || findings.trustedByStar) && <CommunityTrustCallout />}
              {isUnchangedScan && (
                <UnchangedRepoCallout lastScannedAt={repoData.SCANNED_AT} />
              )}
              <p className="text-foreground leading-relaxed">
                {findings.aiSummary || "No summary available"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Findings</CardTitle>
              <CardDescription>
                Detailed scan results from code analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityCategories.map((category) => (
                  <SecurityCategory
                    key={category.key}
                    categoryKey={category.key}
                    title={category.title}
                    description={category.description}
                    findings={findings.findings?.[category.key as keyof Findings] || []}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contributor Notes</CardTitle>
              <CardDescription>
                {isLoggedIn
                  ? "Share your experience with this repository"
                  : "Log in to add your notes and experiences"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContributorNotes isLoggedIn={isLoggedIn} />
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
