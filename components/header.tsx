import Link from "next/link";
import { Star } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import { SignInButton } from "@/components/auth/sign-in-button";

export async function Header(): Promise<JSX.Element> {
  let session = null;

  try {
    session = await auth0.getSession();
  } catch (error) {
    // If there's an invalid session cookie, ignore it
    console.error("Failed to get session:", error);
  }

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-semibold"
        >
          <span className="text-2xl">🔒</span>
          <span className="text-foreground">OpenSafe Index</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </Link>
          {session?.user && (
            <Link
              href="/scan"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Scan Repo
            </Link>
          )}
          <Link
            href="https://github.com/gitrlawton/opensafe"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Star className="h-4 w-4 fill-none group-hover:fill-yellow-500 group-hover:stroke-yellow-500" />
          </Link>
          <SignInButton user={session?.user} />
        </nav>
      </div>
    </header>
  );
}
