"use client";

import { useRef, useEffect, useCallback } from "react";
import { isStaticToolUIPart, getStaticToolName } from "ai";
import type { UIMessage } from "ai";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatToolResult } from "./chat-tool-result";
import { ChatToolConfirm } from "./chat-tool-confirm";
import { ChatEmptyState } from "./chat-empty-state";
import { useChatStore } from "@/lib/store";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  error: Error | undefined;
  toolsRequiringConfirmation: string[];
  addToolOutput: (params: {
    toolCallId: string;
    tool: string;
    output: string;
  }) => Promise<void>;
  sendMessage: (params?: { text: string }) => void;
  onSuggestion: (text: string) => void;
}

/**
 * Simple inline markdown renderer for assistant messages.
 * Handles bold, italic, inline code, bullet/numbered lists, and line breaks.
 * No external dependencies.
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;

  function flushList() {
    if (!listItems) return;
    if (listItems.type === "ul") {
      nodes.push(
        <ul
          key={`list-${nodes.length}`}
          className="my-1 list-none space-y-0.5 pl-4"
        >
          {listItems.items.map((item, i) => (
            <li
              key={i}
              className="relative text-sm leading-relaxed before:absolute before:-left-3 before:content-['·'] before:text-[var(--text-tertiary)]"
            >
              {item}
            </li>
          ))}
        </ul>,
      );
    } else {
      nodes.push(
        <ol
          key={`list-${nodes.length}`}
          className="my-1 list-decimal space-y-0.5 pl-5"
        >
          {listItems.items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {item}
            </li>
          ))}
        </ol>,
      );
    }
    listItems = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bullet list: "- item" or "* item"
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (bulletMatch) {
      if (!listItems || listItems.type !== "ul") {
        flushList();
        listItems = { type: "ul", items: [] };
      }
      listItems.items.push(renderInline(bulletMatch[1]));
      continue;
    }

    // Numbered list: "1. item"
    const numberMatch = line.match(/^\s*\d+\.\s+(.*)/);
    if (numberMatch) {
      if (!listItems || listItems.type !== "ol") {
        flushList();
        listItems = { type: "ol", items: [] };
      }
      listItems.items.push(renderInline(numberMatch[1]));
      continue;
    }

    // Not a list item — flush any pending list
    flushList();

    if (line.trim() === "") {
      // Empty line — small gap
      if (i > 0 && i < lines.length - 1) {
        nodes.push(<br key={`br-${i}`} />);
      }
    } else {
      nodes.push(
        <span key={`line-${i}`} className="block text-sm leading-relaxed">
          {renderInline(line)}
        </span>,
      );
    }
  }

  flushList();
  return nodes;
}

/** Render inline markdown: bold, italic, inline code */
function renderInline(text: string): React.ReactNode {
  // Process inline patterns: code, bold, italic
  const parts: React.ReactNode[] = [];
  // Regex matches: `code`, **bold**, *italic*
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add preceding text
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      // Inline code
      parts.push(
        <code
          key={`code-${match.index}`}
          className="rounded bg-surface-tertiary px-1 py-0.5 text-xs font-mono"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      // Bold
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      // Italic
      parts.push(<em key={`em-${match.index}`}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
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

export function ChatMessages({
  messages,
  isLoading,
  error,
  toolsRequiringConfirmation,
  addToolOutput,
  sendMessage,
  onSuggestion,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bumpedIdsRef = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Bump calendar version + highlight affected events when tool results indicate success
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== "assistant" || !lastMsg.parts) return;

    let shouldBump = false;
    const allAffectedIds: string[] = [];

    for (const part of lastMsg.parts) {
      if (
        isStaticToolUIPart(part) &&
        part.state === "output-available" &&
        typeof part.output === "object" &&
        part.output !== null &&
        (part.output as Record<string, unknown>).success === true
      ) {
        const key = part.toolCallId;
        if (key && !bumpedIdsRef.current.has(key)) {
          bumpedIdsRef.current.add(key);
          shouldBump = true;

          // Extract affectedEventIds for highlight
          const output = part.output as Record<string, unknown>;
          const ids = output.affectedEventIds as string[] | undefined;
          if (ids?.length) {
            allAffectedIds.push(...ids);
          }
        }
      }
    }
    if (shouldBump) {
      const store = useChatStore.getState();
      store.bumpCalendarVersion();
      if (allAffectedIds.length > 0) {
        store.highlightEvents(allAffectedIds);
      }
    }
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return <ChatEmptyState onSuggestion={onSuggestion} disabled={isLoading} />;
  }

  return (
    <>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "flex flex-col gap-1.5 animate-fade-in",
            msg.role === "user" ? "items-end" : "items-start",
          )}
        >
          {msg.parts?.map((part, i) => {
            // Text content
            if (part.type === "text" && part.text.trim()) {
              if (msg.role === "user") {
                return (
                  <div
                    key={i}
                    className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2.5 text-sm leading-relaxed text-white"
                  >
                    {part.text}
                  </div>
                );
              }

              // Assistant message — render markdown
              return (
                <div
                  key={i}
                  className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-secondary px-3.5 py-2.5 text-[var(--text-primary)] leading-relaxed"
                >
                  {renderMarkdown(part.text)}
                </div>
              );
            }

            // Tool UI parts
            if (isStaticToolUIPart(part)) {
              const toolName = getStaticToolName(part);
              const toolCallId = part.toolCallId;

              // Confirmation-required tool awaiting user input
              if (
                toolsRequiringConfirmation.includes(toolName) &&
                part.state === "input-available"
              ) {
                return (
                  <div key={toolCallId} className="w-full max-w-[85%]">
                    <ChatToolConfirm
                      toolName={toolName}
                      input={part.input as Record<string, unknown>}
                      toolCallId={toolCallId}
                      addToolOutput={addToolOutput}
                      sendMessage={() => sendMessage()}
                    />
                  </div>
                );
              }

              // Tool with output available — show result card
              if (
                part.state === "output-available" &&
                typeof part.output === "object" &&
                part.output !== null
              ) {
                return (
                  <div key={toolCallId} className="w-full max-w-[85%]">
                    <ChatToolResult
                      toolName={toolName}
                      output={part.output as Record<string, unknown>}
                    />
                  </div>
                );
              }

              // Tool is executing (spinner)
              if (
                part.state === "input-streaming" ||
                part.state === "input-available"
              ) {
                // Only show spinner for auto-execute tools, not confirmation tools
                if (!toolsRequiringConfirmation.includes(toolName)) {
                  return (
                    <div
                      key={toolCallId ?? `tool-${i}`}
                      className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] animate-fade-in"
                    >
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-tertiary)] border-t-transparent" />
                      Working on it...
                    </div>
                  );
                }
              }
            }

            return null;
          })}
        </div>
      ))}

      {error && !isLoading && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                Greg couldn&apos;t respond
              </p>
              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400/80">
                Something went wrong. Try sending your message again.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading &&
        !messages.some((m) =>
          m.parts?.some(
            (p) => isStaticToolUIPart(p) && p.state === "input-streaming",
          ),
        ) && <TypingIndicator />}

      <div ref={messagesEndRef} />
    </>
  );
}
