import Link from "next/link";
import { SafetyBadge } from "@/components/safety-badge";
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
import { PageLayout, PageContainer } from "@/components/page-layout";
import { BackLink } from "@/components/back-link";
import { SecurityCategory } from "./security-findings";
import type { PageProps } from "@/types/api";
import type { Findings } from "@/types/scan";

type RepoPageProps = PageProps<{
  owner: string;
  name: string;
}>;

// Mock data - in real app, fetch based on params
const mockRepoDetails = {
  name: "react",
  owner: "facebook",
  language: "JavaScript",
  safetyScore: 95,
  lastScanned: "2 hours ago",
  aiSummary:
    "This repository appears to be safe for cloning and installation. It's the official React library from Meta (Facebook), with verified maintainers and no detected security threats. No malicious code patterns, suspicious dependencies, hidden scripts, or credential harvesting attempts were found. The repository follows security best practices and has an active security policy.",
  findings: [
    {
      type: "success",
      title: "No Malicious Code Detected",
      description:
        "Code analysis found no obfuscated code, crypto miners, keyloggers, or backdoor patterns.",
    },
    {
      type: "success",
      title: "Dependencies Verified",
      description:
        "All dependencies are from trusted sources with no known vulnerabilities or suspicious install scripts.",
    },
    {
      type: "success",
      title: "No Suspicious Network Activity",
      description:
        "No unauthorized network calls, data exfiltration attempts, or connections to unknown domains detected.",
    },
    {
      type: "info",
      title: "Active Security Policy",
      description:
        "Repository includes SECURITY.md with vulnerability reporting guidelines and active security monitoring.",
    },
    {
      type: "success",
      title: "Verified Maintainers",
      description:
        "All maintainers are verified accounts from established organizations with strong security track records.",
    },
  ],
};

export default async function RepoDetailPage({ params }: RepoPageProps): Promise<JSX.Element> {
  const { owner, name } = await params;

  // Get authentication status
  const session = await auth0.getSession();
  const isLoggedIn = !!session?.user;

  // Fetch repo data from Snowflake
  let repoData = await getRepoByOwnerAndName(owner, name);

  // Check for mock repo example
  if (!repoData && owner === "test-user" && name === "example-repo") {
    repoData = {
      ID: "mock-1",
      REPO_OWNER: "test-user",
      REPO_NAME: "example-repo",
      LANGUAGE: "JavaScript",
      SAFETY_SCORE: "CAUTION",
      SCANNED_AT: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      SCANNED_BY: "demo-user",
      FINDINGS: {
        repoUrl: "https://github.com/test-user/example-repo",
        safetyLevel: "caution",
        scannedAt: new Date(Date.now() - 3600000).toISOString(),
        validated: true,
        aiSummary:
          "This repository has some security concerns that should be addressed. Two dependency-related issues were found along with one instance of potentially malicious code. Network activity, file system operations, and credential handling appear to be safe.",
        findings: {
          maliciousCode: [
            {
              item: "Obfuscated JavaScript Function",
              issue:
                "Found heavily obfuscated code that attempts to hide its true functionality. This pattern is commonly used in malicious scripts.",
              location: "src/utils/analytics.js",
              severity: "severe",
              codeSnippet: 'eval(atob("ZG9jdW1lbnQubG9jYXRpb24uaHJlZg=="))',
            },
          ],
          dependencies: [
            {
              item: "Outdated lodash version (4.17.15)",
              issue:
                "This version has known prototype pollution vulnerabilities (CVE-2019-10744). Update to 4.17.21 or later.",
              location: "package.json",
              severity: "moderate",
            },
            {
              item: "Suspicious package: data-exfil-helper",
              issue:
                "Dependency 'data-exfil-helper' is not commonly used and has a suspicious name that suggests data exfiltration capabilities.",
              location: "package.json",
              severity: "moderate",
            },
          ],
          networkActivity: [],
          fileSystemSafety: [],
          credentialSafety: [],
        },
      },
    };
  }

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
  const findings = repoData.FINDINGS || mockRepoDetails;

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
