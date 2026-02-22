"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Upload,
  Calendar,
  Settings,
  LogOut,
  Shield,
  FileText,
  Sun,
  Moon,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { isOpen: chatOpen, toggleChat } = useChatStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSignIn = useCallback(() => {
    setSigningIn(true);
    signIn("google");
  }, []);

  const handleSignOut = useCallback(() => {
    setSigningOut(true);
    signOut();
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-[var(--text-primary)] transition-all duration-150 hover:text-[var(--brand-600)]"
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
                  : "text-[var(--text-secondary)] hover:bg-surface-secondary hover:text-[var(--text-primary)]",
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
                  : "text-[var(--text-secondary)] hover:bg-surface-secondary hover:text-[var(--text-primary)]",
              )}
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all duration-150 hover:bg-surface-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}

          {session && (
            <button
              onClick={toggleChat}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20",
                chatOpen
                  ? "bg-surface-tertiary text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-surface-secondary hover:text-[var(--text-primary)]",
              )}
            >
              <span className="hidden sm:inline">Greg</span>
            </button>
          )}

          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-secondary shimmer" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 hover:ring-2 hover:ring-brand-500/20">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "Profile"}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
                      {session.user?.name?.[0] ||
                        session.user?.email?.[0] ||
                        "U"}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {session.user?.name}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/privacy"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Shield className="h-4 w-4" />
                    Privacy Policy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/terms"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4" />
                    Terms of Service
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/about"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Info className="h-4 w-4" />
                    About
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-red-600 focus:text-red-600 cursor-pointer disabled:opacity-50"
                >
                  {signingOut ? (
                    <>
                      <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                      Signing out…
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:opacity-70"
            >
              {signingIn ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
