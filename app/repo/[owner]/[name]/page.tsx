"use client"

import Link from "next/link"
import { SafetyBadge } from "@/components/safety-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Info } from "lucide-react"

interface PageProps {
  params: Promise<{
    owner: string
    name: string
  }>
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
      description: "Code analysis found no obfuscated code, crypto miners, keyloggers, or backdoor patterns.",
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
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, name } = await params
  const isLoggedIn = false // Mock auth state

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case "danger":
        return <AlertTriangle className="h-5 w-5 text-danger" />
      default:
        return <Info className="h-5 w-5 text-primary" />
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-l-success"
      case "warning":
        return "border-l-warning"
      case "danger":
        return "border-l-danger"
      default:
        return "border-l-primary"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={isLoggedIn} />

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
                  {mockRepoDetails.language}
                </span>
                <span>Last scanned {mockRepoDetails.lastScanned}</span>
              </div>
            </div>
            <SafetyBadge score={mockRepoDetails.safetyScore} />
          </div>

          {isLoggedIn && (
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-scan Repo
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis Summary</CardTitle>
              <CardDescription>Automated security and safety assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{mockRepoDetails.aiSummary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Findings</CardTitle>
              <CardDescription>Security checks and code analysis results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRepoDetails.findings.map((finding, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getBorderColor(finding.type)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">{getIcon(finding.type)}</div>
                    <div>
                      <h3 className="font-semibold mb-1">{finding.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contributor Notes</CardTitle>
              <CardDescription>
                {isLoggedIn ? "Share your experience with this repository" : "Log in to add your notes and experiences"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoggedIn ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Share your thoughts about this repository's safety and reliability..."
                    className="min-h-[100px]"
                  />
                  <Button>Post Comment</Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">Log in with GitHub to contribute notes and comments.</p>
                  <Button>Log in with GitHub</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
