"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Upload, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";

export function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { isOpen: chatOpen, toggleChat } = useChatStore();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="font-display text-lg tracking-tight text-[var(--text-primary)] transition-all duration-150 hover:text-[var(--brand-600)]"
        >
          Almanac
        </Link>

        {session && (
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20",
                isActive("/")
                  ? "bg-surface-tertiary text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-surface-secondary hover:text-[var(--text-primary)]"
              )}
            >
              <Upload className="h-4 w-4" />
              Upload
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20",
                isActive("/dashboard")
                  ? "bg-surface-tertiary text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-surface-secondary hover:text-[var(--text-primary)]"
              )}
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3">
          {session && (
            <button
              onClick={toggleChat}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20",
                chatOpen
                  ? "bg-surface-tertiary text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-surface-secondary hover:text-[var(--text-primary)]"
              )}
            >
              <span className="hidden sm:inline">Greg</span>
            </button>
          )}

          {status === "loading" ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-surface-secondary shimmer" />
          ) : session ? (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
                {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
              </div>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20",
                  isActive("/settings")
                    ? "bg-surface-tertiary text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-surface-secondary hover:text-[var(--text-primary)]"
                )}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
