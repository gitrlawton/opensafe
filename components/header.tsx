"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

interface HeaderProps {
  isLoggedIn?: boolean
}

export function Header({ isLoggedIn = false }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
          <span className="text-2xl">🔒</span>
          <span className="text-foreground">OpenSafe Index</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link href="/scan" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Scan Repo
          </Link>
          {isLoggedIn ? (
            <Button variant="outline" size="sm">
              <Github className="mr-2 h-4 w-4" />
              Account
            </Button>
          ) : (
            <Button size="sm">
              <Github className="mr-2 h-4 w-4" />
              Log in with GitHub
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
