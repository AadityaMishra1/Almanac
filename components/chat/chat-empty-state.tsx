"use client";

import { CalendarDays, Calendar, Clock, Search, Cloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ChatEmptyStateProps {
  onSuggestion: (text: string) => void;
  disabled?: boolean;
}

const suggestions: { text: string; icon: LucideIcon }[] = [
  { text: "What does my schedule look like today?", icon: Calendar },
  { text: "Block MWF 2-3pm for study time", icon: Clock },
  { text: "Am I free Thursday afternoon?", icon: Search },
  { text: "Sync everything to Google Calendar", icon: Cloud },
];

export function ChatEmptyState({
  onSuggestion,
  disabled,
}: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
        <CalendarDays className="h-6 w-6 text-brand-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Ask me anything
        </p>
        <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
          Your AI calendar assistant
        </p>
      </div>
      <div className="mt-1 flex flex-col gap-1.5">
        {suggestions.map((suggestion, i) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.text}
              onClick={() => onSuggestion(suggestion.text)}
              style={{
                animationDelay: `${i * 75}ms`,
                animationFillMode: "backwards",
              }}
              disabled={disabled}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-all duration-150 animate-fade-in-up hover:border-[var(--border)] hover:bg-surface-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
              {suggestion.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
