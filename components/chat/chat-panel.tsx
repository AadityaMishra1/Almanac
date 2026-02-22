"use client";

import { useEffect, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isStaticToolUIPart,
  getStaticToolName,
} from "ai";
import {
  X,
  CalendarDays,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import type { HumanInTheLoopUIMessage } from "@/app/api/chat/types";

// HITL tools that require user confirmation before executing
const toolsRequiringConfirmation = ["delete_event", "bulk_delete_events"];

function hasToolResults(
  messages: { parts?: { type: string; state?: string }[] }[],
): boolean {
  return messages.some((m) =>
    m.parts?.some(
      (part) => part.type === "tool" && part.state === "output-available",
    ),
  );
}

export function ChatPanel() {
  const { isOpen, panelSize, setOpen, setPanelSize } = useChatStore();
  const manualOverrideRef = useRef(false);
  const prevToolCountRef = useRef(0);

  const {
    messages,
    addToolOutput,
    sendMessage,
    setMessages,
    status,
    error,
    stop,
  } = useChat<HumanInTheLoopUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Check if there's a pending confirmation that should disable input
  const pendingToolCallConfirmation = messages.some((m) =>
    m.parts?.some(
      (part) =>
        isStaticToolUIPart(part) &&
        part.state === "input-available" &&
        toolsRequiringConfirmation.includes(getStaticToolName(part)),
    ),
  );

  // Smart auto-sizing: expand on open if messages have tool results
  useEffect(() => {
    if (isOpen) {
      manualOverrideRef.current = false;
      if (messages.length > 0 && hasToolResults(messages)) {
        setPanelSize("expanded");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Smart auto-sizing: expand when new tool results arrive
  useEffect(() => {
    if (!isOpen || manualOverrideRef.current) return;

    const currentToolCount = messages.reduce((count, m) => {
      return (
        count +
        (m.parts?.filter(
          (p) => isStaticToolUIPart(p) && p.state === "output-available",
        ).length ?? 0)
      );
    }, 0);

    if (
      currentToolCount > prevToolCountRef.current &&
      panelSize === "compact"
    ) {
      setPanelSize("expanded");
    }
    prevToolCountRef.current = currentToolCount;
  }, [messages, isOpen, panelSize, setPanelSize]);

  // Escape to close
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        if (panelSize === "fullscreen") {
          manualOverrideRef.current = true;
          setPanelSize("compact");
        } else {
          setOpen(false);
        }
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, panelSize, setOpen, setPanelSize]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage({ text });
    },
    [sendMessage],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const handleExpandToggle = useCallback(() => {
    manualOverrideRef.current = true;
    const store = useChatStore.getState();
    if (store.panelSize === "fullscreen") {
      setPanelSize("expanded");
    } else {
      setPanelSize(store.panelSize === "compact" ? "expanded" : "compact");
    }
  }, [setPanelSize]);

  const handleFullscreenToggle = useCallback(() => {
    manualOverrideRef.current = true;
    const store = useChatStore.getState();
    setPanelSize(store.panelSize === "fullscreen" ? "compact" : "fullscreen");
  }, [setPanelSize]);

  if (!isOpen) return null;

  const isFullscreen = panelSize === "fullscreen";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 animate-fade-in",
          isFullscreen
            ? "bg-black/30 backdrop-blur-sm"
            : "bg-black/20 backdrop-blur-sm",
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Panel */}
      {isFullscreen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <aside
            role="dialog"
            aria-label="Greg - Calendar Assistant"
            className="pointer-events-auto flex w-full max-w-3xl flex-col rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-2xl animate-scale-in h-[90vh]"
          >
            <PanelHeader
              messages={messages}
              panelSize={panelSize}
              onClear={handleClear}
              onExpandToggle={handleExpandToggle}
              onFullscreenToggle={handleFullscreenToggle}
              onClose={() => setOpen(false)}
            />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <ChatMessages
                messages={messages}
                isLoading={isLoading}
                error={error}
                toolsRequiringConfirmation={toolsRequiringConfirmation}
                addToolOutput={addToolOutput}
                sendMessage={sendMessage}
                onSuggestion={handleSend}
              />
            </div>
            <ChatInput
              onSend={handleSend}
              disabled={isLoading || pendingToolCallConfirmation}
              isLoading={isLoading}
              onStop={stop}
            />
          </aside>
        </div>
      ) : (
        <aside
          role="dialog"
          aria-label="Greg - Calendar Assistant"
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[var(--border-subtle)] bg-surface shadow-2xl animate-slide-in-right transition-[width] duration-300 ease-in-out",
            panelSize === "compact" ? "sm:w-[420px]" : "sm:w-[640px]",
          )}
        >
          <PanelHeader
            messages={messages}
            panelSize={panelSize}
            onClear={handleClear}
            onExpandToggle={handleExpandToggle}
            onFullscreenToggle={handleFullscreenToggle}
            onClose={() => setOpen(false)}
          />
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              error={error}
              toolsRequiringConfirmation={toolsRequiringConfirmation}
              addToolOutput={addToolOutput}
              sendMessage={sendMessage}
              onSuggestion={handleSend}
            />
          </div>
          <ChatInput
            onSend={handleSend}
            disabled={isLoading || pendingToolCallConfirmation}
          />
        </aside>
      )}
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  messages: { id: string }[];
  panelSize: "compact" | "expanded" | "fullscreen";
  onClear: () => void;
  onExpandToggle: () => void;
  onFullscreenToggle: () => void;
  onClose: () => void;
}

function PanelHeader({
  messages,
  panelSize,
  onClear,
  onExpandToggle,
  onFullscreenToggle,
  onClose,
}: PanelHeaderProps) {
  const isFullscreen = panelSize === "fullscreen";

  const iconBtnClass =
    "rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)] hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5",
        isFullscreen && "rounded-t-2xl",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100">
          <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Greg
        </span>
      </div>
      <div className="flex items-center gap-1">
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-surface-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
          >
            Clear
          </button>
        )}

        {/* Expand/collapse — hidden on mobile */}
        <button
          onClick={onExpandToggle}
          className={cn(iconBtnClass, "hidden sm:flex")}
          title={panelSize === "compact" ? "Expand panel" : "Collapse panel"}
        >
          {panelSize === "compact" ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Minimize2 className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Fullscreen toggle — hidden on mobile */}
        <button
          onClick={onFullscreenToggle}
          className={cn(iconBtnClass, "hidden sm:flex")}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Shrink className="h-3.5 w-3.5" />
          ) : (
            <Expand className="h-3.5 w-3.5" />
          )}
        </button>

        <button onClick={onClose} className={iconBtnClass}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
