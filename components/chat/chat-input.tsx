"use client";

import { useRef, useCallback } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  isLoading?: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, disabled, isLoading, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const content = textareaRef.current?.value.trim();
    if (!content || disabled) return;

    textareaRef.current!.value = "";
    textareaRef.current!.style.height = "auto";
    onSend(content);
  }, [onSend, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  return (
    <div className="border-t border-[var(--border-subtle)] px-4 py-3">
      <div className="flex items-end gap-2 rounded-xl border border-[var(--border-subtle)] bg-surface-secondary px-3 py-2 transition-colors duration-150 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500/10">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={
            disabled
              ? "Waiting for confirmation..."
              : "Ask about your schedule..."
          }
          className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              "bg-red-500 text-white transition-all duration-150",
              "hover:bg-red-600 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
            )}
            title="Stop generating"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition-all duration-150 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-center text-[10px] text-[var(--text-tertiary)]">
        Powered by Llama. May make mistakes about your schedule.
      </p>
    </div>
  );
}
