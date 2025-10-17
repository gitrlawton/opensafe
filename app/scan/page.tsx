"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Github, CheckCircle2 } from "lucide-react"

export default function ScanPage() {
  const [repoUrl, setRepoUrl] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsScanning(true)

    // Simulate scanning
    setTimeout(() => {
      setIsScanning(false)
      setScanComplete(true)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-balance">Scan New Repository</h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Submit a GitHub repository URL to scan for malicious code, suspicious dependencies, and security threats.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repository URL</CardTitle>
            <CardDescription>
              Enter the full GitHub repository URL (e.g., https://github.com/owner/repo)
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

              {scanComplete && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 text-success border border-success/20">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="text-sm font-medium">Scan complete! Redirecting to results...</p>
                </div>
              )}

              <Button type="submit" disabled={isScanning || !repoUrl} className="w-full">
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning Repository...
                  </>
                ) : (
                  "Start Scan"
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-semibold mb-3">Security checks performed:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Crypto miners, keyloggers, and backdoor detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Hidden install scripts and post-install hooks analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Suspicious dependencies and package integrity verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Credential harvesting and data exfiltration patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Obfuscated code and suspicious network calls</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Maintainer verification and repository authenticity</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
