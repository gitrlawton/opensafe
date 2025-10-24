"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Github } from "lucide-react";

interface SignInButtonProps {
  user?: {
    name?: string;
    email?: string;
    picture?: string;
  } | null;
}

export function SignInButton({ user }: SignInButtonProps): JSX.Element {
  if (!user) {
    return (
      <Button size="sm" asChild>
        <a href="/auth/login">
          <Github className="mr-2 h-4 w-4" />
          Log in with GitHub
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Github className="mr-2 h-4 w-4" />
          {user.name || "Account"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href="/auth/logout">Log out</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
