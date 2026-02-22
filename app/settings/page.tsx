"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Download, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    redirect("/");
  }

  const handleExportData = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/account/export", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename =
        contentDisposition?.match(/filename="(.+)"/)?.[1] ||
        `almanac-data-export-${new Date().toISOString().split("T")[0]}.json`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess("Data exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Sign out and redirect to home
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Account Settings
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage your data and account preferences
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              {success}
            </p>
          </div>
        )}

        {/* Account Info */}
        <section className="mb-8 p-6 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Account Information
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Email:</span>
              <span className="text-[var(--text-primary)] font-medium">
                {session?.user?.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Name:</span>
              <span className="text-[var(--text-primary)] font-medium">
                {session?.user?.name}
              </span>
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section className="mb-8 p-6 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Export Your Data
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Download all your data (profile, events, courses) as a JSON
                file. This includes everything stored in your account.
              </p>
              <Button
                onClick={handleExportData}
                disabled={isExporting}
                variant="outline"
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Account Deletion */}
        <section className="p-6 bg-[var(--surface-secondary)] border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                Delete Account
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-200">
                    <strong>Warning:</strong> This will permanently delete:
                  </p>
                </div>
                <ul className="mt-2 ml-6 text-xs text-red-800 dark:text-red-200 list-disc space-y-1">
                  <li>Your account and profile</li>
                  <li>All events and courses</li>
                  <li>Calendar sync configuration</li>
                  <li>All uploaded syllabus data</li>
                </ul>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isDeleting}
                    className="gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove all your data from our servers,
                      including:
                      <ul className="mt-2 ml-4 list-disc space-y-1">
                        <li>All events and courses</li>
                        <li>Calendar sync settings</li>
                        <li>Your profile and preferences</li>
                      </ul>
                      <p className="mt-3 font-semibold">
                        We recommend exporting your data before deleting your
                        account.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting…
                        </span>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>

        {/* Privacy Links */}
        <footer className="mt-8 pt-6 border-t border-[var(--border)] text-center">
          <p className="text-sm text-[var(--text-tertiary)]">
            Questions about data privacy?{" "}
            <a
              href="/privacy"
              className="text-[var(--brand-600)] hover:underline"
            >
              Read our Privacy Policy
            </a>{" "}
            or{" "}
            <a
              href="mailto:almanac123@googlegroups.com"
              className="text-[var(--brand-600)] hover:underline"
            >
              contact us
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
