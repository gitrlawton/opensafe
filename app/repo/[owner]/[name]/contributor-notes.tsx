'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ContributorNotesProps {
  isLoggedIn: boolean;
}

export function ContributorNotes({
  isLoggedIn,
}: ContributorNotesProps): JSX.Element {
  return (
    <div className="opacity-50 pointer-events-none">
      {isLoggedIn ? (
        <div className="space-y-4">
          <Textarea
            placeholder="Share your thoughts about this repository's safety and reliability..."
            className="min-h-[100px]"
            disabled
          />
          <Button disabled>Post Comment (Coming Soon)</Button>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-4">
            Log in with GitHub to contribute notes and comments.
          </p>
          <Button disabled>Log in with GitHub (Coming Soon)</Button>
        </div>
      )}
    </div>
  );
}
