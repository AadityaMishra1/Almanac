"use client";

import { AlertTriangle } from "lucide-react";
import { APPROVAL } from "@/app/api/chat/utils";

interface ChatToolConfirmProps {
  toolName: string;
  input: Record<string, unknown>;
  toolCallId: string;
  addToolOutput: (params: {
    toolCallId: string;
    tool: string;
    output: string;
  }) => Promise<void>;
  sendMessage: () => void;
}

export function ChatToolConfirm({
  toolName,
  input,
  toolCallId,
  addToolOutput,
  sendMessage,
}: ChatToolConfirmProps) {
  async function handleConfirm() {
    await addToolOutput({
      toolCallId,
      tool: toolName,
      output: APPROVAL.YES,
    });
    sendMessage();
  }

  async function handleCancel() {
    await addToolOutput({
      toolCallId,
      tool: toolName,
      output: APPROVAL.NO,
    });
    sendMessage();
  }

  if (toolName === "delete_event") {
    const title = (input.eventTitle as string) || "this event";
    const date = (input.eventDate as string) || "";

    return (
      <ConfirmCard
        heading="Delete event?"
        description={`\u201c${title}\u201d${date ? ` \u2014 ${date}` : ""}`}
        confirmLabel="Delete"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  if (toolName === "bulk_delete_events") {
    const eventIds = (input.eventIds as string[]) || [];
    const reason = (input.reason as string) || "selected events";

    return (
      <ConfirmCard
        heading={`Delete ${eventIds.length} event${eventIds.length !== 1 ? "s" : ""}?`}
        description={reason}
        confirmLabel={`Delete ${eventIds.length}`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return null;
}

function ConfirmCard({
  heading,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  heading: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3.5 dark:border-red-900/40 dark:bg-red-950/20">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">
            {heading}
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
            {description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-surface-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
