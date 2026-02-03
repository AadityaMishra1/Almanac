'use client';

import type { UIMessage } from 'ai';
import { useEffect, useRef } from 'react';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-lg font-medium text-zinc-900">
            Hi! I can help you manage your events.
          </p>
          <p className="text-sm text-zinc-600">
            Try asking me things like:
          </p>
          <ul className="space-y-1 text-sm text-zinc-700">
            <li>&quot;Show me this week&apos;s assignments&quot;</li>
            <li>&quot;Move CSC 316 exam to Friday&quot;</li>
            <li>&quot;Delete all assignments after spring break&quot;</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((message) => {
        // User message
        if (message.role === 'user') {
          // Extract text from parts
          const textParts = message.parts.filter((p) => p.type === 'text');
          const text = textParts.map((p: any) => p.text).join('');

          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[80%] overflow-wrap break-words rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                {text}
              </div>
            </div>
          );
        }

        // Assistant message
        if (message.role === 'assistant') {
          // Extract text from parts
          const textParts = message.parts.filter((p) => p.type === 'text');
          const text = textParts.map((p: any) => p.text).join('');

          // Extract tool calls for display
          const toolParts = message.parts.filter((p) => p.type === 'tool-call');

          return (
            <div key={message.id} className="flex flex-col gap-2 items-start">
              {text && (
                <div className="max-w-[80%] overflow-wrap break-words rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-900">
                  {text}
                </div>
              )}
              {toolParts.length > 0 && (
                <div className="max-w-[80%] overflow-wrap break-words rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2">
                  <p className="text-xs font-medium text-zinc-600">Tool Calls ({toolParts.length})</p>
                  <pre className="mt-1 overflow-x-auto text-xs text-zinc-800">
                    {JSON.stringify(toolParts, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        }

        return null;
      })}

      {/* Typing indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-zinc-100 px-4 py-3">
            <div className="flex space-x-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-500"></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
