'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Github } from 'lucide-react';

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
        <a href="/auth/login" className="cursor-pointer">
          <Github className="mr-2 h-4 w-4" />
          Log in with GitHub
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border"
        >
          <Github className="mr-2 h-4 w-4" />
          {user.name || 'Account'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuItem
          asChild
          className="focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-foreground"
        >
          <a href="/auth/logout" className="cursor-pointer">
            Log out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
