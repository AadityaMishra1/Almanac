"use client";

import { useRef, useEffect, useCallback } from "react";
import { X, Send, CalendarDays, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";

function RelativeTime({ date }: { date: string }) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  let label: string;
  if (diffMin < 1) label = "just now";
  else if (diffMin < 60) label = `${diffMin}m ago`;
  else {
    const diffHr = Math.floor(diffMin / 60);
    label = diffHr < 24 ? `${diffHr}h ago` : `${Math.floor(diffHr / 24)}d ago`;
  }

  return <span className="text-xs text-[var(--text-tertiary)]">{label}</span>;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface-secondary px-4 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-tertiary)] [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-tertiary)] [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-tertiary)] [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function ChatPanel() {
  const {
    messages,
    isOpen,
    isLoading,
    addMessage,
    setLoading,
    setOpen,
    clearMessages,
    bumpCalendarVersion,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, setOpen]);

  const sendMessage = useCallback(async () => {
    const content = textareaRef.current?.value.trim();
    if (!content || isLoading) return;

    textareaRef.current!.value = "";
    textareaRef.current!.style.height = "auto";

    addMessage({ role: "user", content });

    const apiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        addMessage({
          role: "assistant",
          content: `Sorry, something went wrong: ${err.error || "Unknown error"}`,
        });
        return;
      }

      const data = await res.json();
      addMessage({ role: "assistant", content: data.message, actionsPerformed: data.actionsPerformed || false });
      if (data.actionsPerformed) {
        bumpCalendarVersion();
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, I couldn't connect to the server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [messages, isLoading, addMessage, setLoading, bumpCalendarVersion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Almanac AI Chat"
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[var(--border-subtle)] bg-surface shadow-2xl animate-slide-in-right sm:w-[420px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100">
              <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Almanac AI
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-surface-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors duration-150 hover:bg-surface-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center animate-fade-in">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
                <CalendarDays className="h-5 w-5 text-brand-500" />
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Ask me anything
              </p>
              <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
                I know your courses and upcoming deadlines. Try asking about
                what&apos;s due this week, study tips, or schedule planning.
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {[
                  "Create a study session for tomorrow",
                  "Delete my quiz on Friday",
                  "Reschedule midterm to next week",
                  "Sync all events to Google Calendar",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      if (textareaRef.current) {
                        textareaRef.current.value = suggestion;
                        sendMessage();
                      }
                    }}
                    className="rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-all duration-150 hover:border-[var(--border)] hover:bg-surface-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1 animate-fade-in",
                msg.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-md bg-brand-500 text-white"
                    : "rounded-2xl rounded-bl-md bg-surface-secondary text-[var(--text-primary)]"
                )}
              >
                {msg.content}
              </div>
              {msg.actionsPerformed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                  <Check className="h-3 w-3" /> Action taken
                </span>
              )}
              <RelativeTime date={msg.createdAt} />
            </div>
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-[var(--border-subtle)] bg-surface-secondary px-3 py-2 transition-colors duration-150 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500/10">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask about your schedule..."
              className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition-all duration-150 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-[var(--text-tertiary)]">
            Powered by Groq. May make mistakes about your schedule.
          </p>
        </div>
      </aside>
    </>
  );
}
