"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafetyBadge } from "@/components/safety-badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLayout, PageContainer } from "@/components/page-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui-states";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScannedRepo } from "@/types/api";

// Mock data
const mockRepos = [
  {
    id: "1",
    name: "vue",
    owner: "vuejs",
    language: "TypeScript",
    safetyScore: 92,
    lastScanned: "5 hours ago",
  },
  {
    id: "2",
    name: "suspicious-package",
    owner: "unknown-dev",
    language: "Python",
    safetyScore: 45,
    lastScanned: "1 day ago",
  },
  {
    id: "3",
    name: "next.js",
    owner: "vercel",
    language: "TypeScript",
    safetyScore: 98,
    lastScanned: "3 hours ago",
  },
  {
    id: "4",
    name: "tensorflow",
    owner: "tensorflow",
    language: "Python",
    safetyScore: "SAFE",
    lastScanned: "6 hours ago",
  },
  {
    id: "5",
    name: "malicious-script",
    owner: "bad-actor",
    language: "JavaScript",
    safetyScore: 12,
    lastScanned: "2 days ago",
  },
  {
    id: "6",
    name: "svelte",
    owner: "sveltejs",
    language: "TypeScript",
    safetyScore: 94,
    lastScanned: "4 hours ago",
  },
  {
    id: "7",
    name: "express",
    owner: "expressjs",
    language: "JavaScript",
    safetyScore: "SAFE",
    lastScanned: "8 hours ago",
  },
  {
    id: "8",
    name: "example-repo",
    owner: "test-user",
    language: "JavaScript",
    safetyScore: "CAUTION",
    lastScanned: "1 hour ago",
  },
];

export default function HomePage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [allRepos, setAllRepos] = useState<ScannedRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async (): Promise<void> => {
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
        setError(err.message || "Failed to fetch repositories");
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
    <PageLayout>
      <PageContainer>
        <PageHeader
          title="Verify Before You Clone"
          description="Scan GitHub repositories for malicious code, suspicious dependencies, and security threats before cloning."
        />

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

        {error && (
          <div className="mb-4 p-4 border border-warning/50 rounded-md bg-warning/10">
            <p className="text-sm text-warning-foreground">
              <strong>Note:</strong> Unable to load recent scans from the
              database. Showing example data only. {error}
            </p>
          </div>
        )}

        {isLoading && (
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
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-7 w-10 rounded-md" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <EmptyState
            icon={<Search className="h-12 w-12 text-muted-foreground" />}
            message="No repositories found matching your search."
          />
        )}
      </PageContainer>
    </PageLayout>
  );
}
