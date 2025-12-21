"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button variant="outline" disabled>
        Loading...
      </Button>
    );
  }

  if (!session) {
    return (
      <Button onClick={() => signIn("google")} variant="default">
        Sign in with Google
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-sm text-zinc-600 sm:block">{session.user?.email}</div>
      <Button onClick={() => signOut()} variant="outline">
        Sign out
      </Button>
    </div>
  );
}
