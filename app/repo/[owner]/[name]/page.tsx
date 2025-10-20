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
import { ArrowLeft, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import { getRepoByOwnerAndName } from "@/lib/snowflake";
import { RescanButton } from "./rescan-button";
import { ContributorNotes } from "./contributor-notes";

interface PageProps {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

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

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, name } = await params;

  // Get authentication status
  const session = await auth0.getSession();
  const isLoggedIn = !!session?.user;

  // Fetch repo data from Snowflake
  let repoData = await getRepoByOwnerAndName(owner, name);

  // Check for mock repo example
  if (!repoData && owner === "test-user" && name === "example-repo") {
    repoData = {
      REPO_OWNER: "test-user",
      REPO_NAME: "example-repo",
      LANGUAGE: "JavaScript",
      SAFETY_SCORE: "CAUTION",
      SCANNED_AT: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      FINDINGS: {
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
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all repositories
          </Link>
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
        </main>
      </div>
    );
  }

  // Parse the findings JSON
  const findings = repoData.FINDINGS || mockRepoDetails;

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "danger":
        return <AlertTriangle className="h-5 w-5 text-danger" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-l-success";
      case "warning":
        return "border-l-warning";
      case "danger":
        return "border-l-danger";
      default:
        return "border-l-primary";
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "Unknown";
    const scanned = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - scanned.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return scanned.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all repositories
        </Link>

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
              <CardTitle>AI Analysis Summary</CardTitle>
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
                {/* Display all 5 security categories */}
                {[
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
                ].map((category) => {
                  const categoryFindings =
                    findings.findings?.[category.key] || [];
                  const findingsCount = categoryFindings.length;
                  const hasFindings = findingsCount > 0;

                  // Determine the most severe level in this category
                  let categorySeverity = "moderate"; // Default to moderate if there are findings
                  if (hasFindings) {
                    const hasSevere = categoryFindings.some(
                      (f: any) => f.severity === "severe"
                    );
                    if (hasSevere) categorySeverity = "severe";
                  }

                  const categoryType =
                    categorySeverity === "severe" ? "danger" : "warning";

                  const getBadgeColor = (type: string) => {
                    return type === "danger"
                      ? "bg-danger/20 text-danger"
                      : "bg-warning/20 text-warning";
                  };

                  return (
                    <div key={category.key}>
                      {hasFindings ? (
                        // Show count and findings if they exist
                        <div className="space-y-3">
                          <div
                            className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getBorderColor(categoryType)}`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <div
                                className={`flex items-center justify-center w-6 h-6 rounded-full ${getBadgeColor(categoryType)} font-bold text-sm`}
                              >
                                {findingsCount}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">
                                {category.key === "maliciousCode"
                                  ? "Malicious Code Issues"
                                  : category.key === "dependencies"
                                    ? "Dependency Issues"
                                    : category.key === "networkActivity"
                                      ? "Network Activity Issues"
                                      : category.key === "fileSystemSafety"
                                        ? "File System Issues"
                                        : "Credential Safety Issues"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {findingsCount} issue
                                {findingsCount > 1 ? "s" : ""} detected
                              </p>
                            </div>
                          </div>
                          {categoryFindings.map(
                            (finding: any, index: number) => {
                              const severity = finding.severity || "moderate";
                              const type =
                                severity === "severe" ? "danger" : "warning";

                              return (
                                <div
                                  key={index}
                                  className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getBorderColor(type)} ml-9`}
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    {getIcon(type)}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-1">
                                      {finding.item}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-1">
                                      {finding.issue}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Location: {finding.location}
                                    </p>
                                    {finding.codeSnippet && (
                                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                        {finding.codeSnippet}
                                      </pre>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        // Show success message if no findings
                        <div className="flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 border-l-success">
                          <div className="flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">
                              {category.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
      </main>
    </div>
  );
}
