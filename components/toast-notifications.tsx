"use client";

import * as React from "react";
import { useNotificationStore } from "@/lib/store";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const TOAST_DURATION = 4000;
const FADE_OUT_DURATION = 200;

interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  exiting: boolean;
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-900 dark:text-emerald-100",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200/60 dark:border-red-800/40",
    iconColor: "text-red-600 dark:text-red-400",
    text: "text-red-900 dark:text-red-100",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200/60 dark:border-amber-800/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    text: "text-amber-900 dark:text-amber-100",
  },
  info: {
    icon: Info,
    bg: "bg-brand-50 dark:bg-brand-950/40",
    border: "border-brand-200/60 dark:border-brand-800/40",
    iconColor: "text-brand-600 dark:text-brand-400",
    text: "text-[var(--text-primary)]",
  },
} as const;

export function ToastNotifications() {
  const { notifications, markAsRead } = useNotificationStore();
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const seenRef = React.useRef<Set<string>>(new Set());

  // Watch for new notifications and spawn toasts
  React.useEffect(() => {
    for (const n of notifications) {
      if (seenRef.current.has(n.id)) continue;
      seenRef.current.add(n.id);

      const toast: ToastItem = {
        id: n.id,
        message: n.message,
        type: n.type,
        exiting: false,
      };

      setToasts((prev) => [toast, ...prev]);
    }
  }, [notifications]);

  const dismiss = React.useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        markAsRead(id);
      }, FADE_OUT_DURATION);
    },
    [markAsRead]
  );

  // Auto-dismiss after TOAST_DURATION
  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const toast of toasts) {
      if (toast.exiting) continue;
      const timer = setTimeout(() => dismiss(toast.id), TOAST_DURATION);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-2rem)]">
      {toasts.map((toast, index) => {
        const config = typeConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              "rounded-xl border px-4 py-3 shadow-lg shadow-black/5",
              "transition-all duration-200",
              config.bg,
              config.border,
              toast.exiting
                ? "opacity-0 translate-x-4"
                : "animate-slide-in-right"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <Icon
                className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconColor)}
              />
              <p className={cn("text-sm leading-relaxed flex-1", config.text)}>
                {toast.message}
              </p>
              <button
                onClick={() => dismiss(toast.id)}
                className={cn(
                  "shrink-0 rounded-lg p-1 -m-1",
                  "transition-colors duration-150",
                  "hover:bg-black/5 dark:hover:bg-white/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                )}
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
