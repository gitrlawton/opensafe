"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafetyBadge } from "@/components/safety-badge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ScannedRepo {
  id: string;
  name: string;
  owner: string;
  language: string;
  safetyScore: string | number; // Support both "SAFE"/"CAUTION"/"UNSAFE" and numeric scores
  lastScanned: string;
  scannedBy?: string;
}

// Mock data
const mockRepos = [
  {
    id: "1",
    name: "react",
    owner: "facebook",
    language: "JavaScript",
    safetyScore: 95,
    lastScanned: "2 hours ago",
  },
  {
    id: "2",
    name: "vue",
    owner: "vuejs",
    language: "TypeScript",
    safetyScore: 92,
    lastScanned: "5 hours ago",
  },
  {
    id: "3",
    name: "suspicious-package",
    owner: "unknown-dev",
    language: "Python",
    safetyScore: 45,
    lastScanned: "1 day ago",
  },
  {
    id: "4",
    name: "next.js",
    owner: "vercel",
    language: "TypeScript",
    safetyScore: 98,
    lastScanned: "3 hours ago",
  },
  {
    id: "5",
    name: "tensorflow",
    owner: "tensorflow",
    language: "Python",
    safetyScore: 88,
    lastScanned: "6 hours ago",
  },
  {
    id: "6",
    name: "malicious-script",
    owner: "bad-actor",
    language: "JavaScript",
    safetyScore: 12,
    lastScanned: "2 days ago",
  },
  {
    id: "7",
    name: "svelte",
    owner: "sveltejs",
    language: "TypeScript",
    safetyScore: 94,
    lastScanned: "4 hours ago",
  },
  {
    id: "8",
    name: "express",
    owner: "expressjs",
    language: "JavaScript",
    safetyScore: 85,
    lastScanned: "8 hours ago",
  },
  {
    id: "9",
    name: "example-repo",
    owner: "test-user",
    language: "JavaScript",
    safetyScore: "CAUTION",
    lastScanned: "1 hour ago",
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allRepos, setAllRepos] = useState<ScannedRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/repos");

        if (!response.ok) {
          throw new Error("Failed to fetch repositories");
        }

        const snowflakeRepos = await response.json();

        // Merge with mock data - show Snowflake repos first, then mock data
        setAllRepos([...snowflakeRepos, ...mockRepos]);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch repos:", err);
        setError(err.message);
        // Fall back to just mock data if Snowflake fails
        setAllRepos(mockRepos);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const filteredRepos = allRepos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-balance">
            Verify Before You Clone
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Scan GitHub repositories for malicious code, suspicious
            dependencies, and security threats before cloning.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Repo Name</TableHead>
                  <TableHead className="font-semibold">Owner</TableHead>
                  <TableHead className="font-semibold">Language</TableHead>
                  <TableHead className="font-semibold">Safety Level</TableHead>
                  <TableHead className="font-semibold">Last Scanned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepos.map((repo) => (
                  <TableRow key={repo.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/repo/${repo.owner}/${repo.name}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {repo.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {repo.owner}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                        {repo.language}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SafetyBadge score={repo.safetyScore} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {repo.lastScanned}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && filteredRepos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No repositories found matching your search.
          </div>
        )}
      </main>
    </div>
  );
}
