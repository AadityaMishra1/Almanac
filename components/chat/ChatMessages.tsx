'use client';

import type { UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { CommandConfirmation } from './CommandConfirmation';
import { BulkConfirmation } from './BulkConfirmation';
import { ConfirmationPayload, EventSnapshot } from '@/types/chat';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  onOperationComplete: () => void;
}

type ConfirmationState = 'pending' | 'approved' | 'rejected' | 'executing' | 'done' | 'error';

export function ChatMessages({ messages, isLoading, onOperationComplete }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track confirmation state per tool call ID
  const [confirmationStates, setConfirmationStates] = useState<Map<string, ConfirmationState>>(
    new Map()
  );
  const [errorMessages, setErrorMessages] = useState<Map<string, string>>(new Map());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, confirmationStates]);

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-lg font-medium text-zinc-900">Hi! I can help you manage your events.</p>
          <p className="text-sm text-zinc-600">Try asking me things like:</p>
          <ul className="space-y-1 text-sm text-zinc-700">
            <li>&quot;Show me this week&apos;s assignments&quot;</li>
            <li>&quot;Move CSC 316 exam to Friday&quot;</li>
            <li>&quot;Delete all assignments after spring break&quot;</li>
          </ul>
        </div>
      </div>
    );
  }

  // Format date nicely for query results
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle approval for single event operations
  const handleApprove = async (toolCallId: string, confirmation: ConfirmationPayload) => {
    // Update state to executing
    setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'executing'));

    try {
      // Build request body based on confirmation type
      let requestBody: any = {
        action: confirmation.type,
        beforeState: confirmation.changes?.before || null,
        afterState: confirmation.changes?.after || null,
      };

      if (confirmation.type === 'modify' && confirmation.changes) {
        requestBody.eventId = confirmation.changes.before.id;
        requestBody.updates = {
          title:
            confirmation.changes.after.title !== confirmation.changes.before.title
              ? confirmation.changes.after.title
              : undefined,
          date:
            confirmation.changes.after.date !== confirmation.changes.before.date
              ? confirmation.changes.after.date
              : undefined,
          time:
            confirmation.changes.after.time !== confirmation.changes.before.time
              ? confirmation.changes.after.time
              : undefined,
          type:
            confirmation.changes.after.type !== confirmation.changes.before.type
              ? confirmation.changes.after.type
              : undefined,
        };
      } else if (confirmation.type === 'delete' && confirmation.items && confirmation.items[0]) {
        requestBody.eventId = confirmation.items[0].id;
      } else if (confirmation.type === 'create' && confirmation.items && confirmation.items[0]) {
        const item = confirmation.items[0];
        // Extract course code from courseName (assume format "Name (CODE)")
        const courseCodeMatch = item.courseName.match(/\(([^)]+)\)/);
        const courseCode = courseCodeMatch ? courseCodeMatch[1] : item.courseName;

        requestBody.newEvent = {
          title: item.title,
          date: item.date,
          time: item.time || null,
          type: item.type,
          courseCode,
        };
      }

      // Call execute endpoint
      const response = await fetch('/api/chat/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.ok) {
        // Update state to done
        setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'done'));
        // Trigger calendar refresh
        onOperationComplete();
      } else {
        // Update state to error
        setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'error'));
        setErrorMessages((prev) => new Map(prev).set(toolCallId, result.error || 'Unknown error'));
      }
    } catch (error) {
      // Update state to error
      setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'error'));
      setErrorMessages(
        (prev) =>
          new Map(prev).set(
            toolCallId,
            error instanceof Error ? error.message : 'Failed to execute. Please try again.'
          )
      );
    }
  };

  // Handle bulk approval
  const handleBulkApprove = async (
    toolCallId: string,
    confirmation: ConfirmationPayload,
    selectedIds: string[]
  ) => {
    // Update state to executing
    setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'executing'));

    try {
      const requestBody = {
        action: 'bulk-delete',
        eventIds: selectedIds,
        beforeState: null,
        afterState: null,
      };

      // Call execute endpoint
      const response = await fetch('/api/chat/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.ok) {
        // Update state to done
        setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'done'));
        // Trigger calendar refresh
        onOperationComplete();
      } else {
        // Update state to error
        setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'error'));
        setErrorMessages((prev) => new Map(prev).set(toolCallId, result.error || 'Unknown error'));
      }
    } catch (error) {
      // Update state to error
      setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'error'));
      setErrorMessages(
        (prev) =>
          new Map(prev).set(
            toolCallId,
            error instanceof Error ? error.message : 'Failed to execute. Please try again.'
          )
      );
    }
  };

  // Handle rejection
  const handleReject = (toolCallId: string) => {
    setConfirmationStates((prev) => new Map(prev).set(toolCallId, 'rejected'));
  };

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

          // Extract tool result parts
          const toolResultParts = message.parts.filter((p) => p.type === 'tool-result');

          return (
            <div key={message.id} className="flex flex-col gap-2 items-start">
              {text && (
                <div className="max-w-[80%] overflow-wrap break-words rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-900">
                  {text}
                </div>
              )}

              {/* Render tool results */}
              {toolResultParts.map((toolPart: any) => {
                const toolCallId = toolPart.toolCallId;
                const result = toolPart.result;

                // Check confirmation state
                const state = confirmationStates.get(toolCallId) || 'pending';
                const errorMessage = errorMessages.get(toolCallId);

                // Parse result - it might be a ConfirmationPayload or query result
                if (result && typeof result === 'object') {
                  // Check if it's a query result (has count and events)
                  if ('count' in result && 'events' in result) {
                    const events = result.events as EventSnapshot[];
                    return (
                      <div
                        key={toolCallId}
                        className="max-w-[80%] overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50"
                      >
                        <div className="border-b border-zinc-200 bg-white px-4 py-2">
                          <p className="text-sm font-medium text-zinc-900">
                            Found {result.count} event{result.count === 1 ? '' : 's'}
                          </p>
                        </div>
                        {events.length > 0 ? (
                          <div className="divide-y divide-zinc-200">
                            {events.map((event, idx) => (
                              <div key={idx} className="px-4 py-2">
                                <div className="text-sm font-medium text-zinc-900">
                                  {event.title}
                                </div>
                                <div className="text-xs text-zinc-600 mt-0.5">
                                  {formatDate(event.date)}
                                  {event.time && ` at ${event.time}`} • {event.type}
                                </div>
                                <div className="text-xs text-zinc-500 mt-0.5">
                                  {event.courseName}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-zinc-600">No events found.</div>
                        )}
                      </div>
                    );
                  }

                  // Check if it's a ConfirmationPayload
                  const confirmation = result as ConfirmationPayload;
                  if (confirmation.type && confirmation.description) {
                    // Render based on state
                    if (state === 'done') {
                      return (
                        <div
                          key={toolCallId}
                          className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800">
                            Done: {confirmation.description}
                          </span>
                        </div>
                      );
                    }

                    if (state === 'rejected') {
                      return (
                        <div
                          key={toolCallId}
                          className="flex items-center gap-2 rounded-lg bg-zinc-100 border border-zinc-200 px-4 py-2"
                        >
                          <span className="text-sm text-zinc-600">Cancelled</span>
                        </div>
                      );
                    }

                    if (state === 'error') {
                      return (
                        <div key={toolCallId} className="space-y-2">
                          {confirmation.type === 'bulk-delete' ? (
                            <BulkConfirmation
                              type={confirmation.type}
                              confirmation={confirmation}
                              onApprove={(selectedIds) =>
                                handleBulkApprove(toolCallId, confirmation, selectedIds)
                              }
                              onReject={() => handleReject(toolCallId)}
                              isExecuting={false}
                            />
                          ) : (
                            <CommandConfirmation
                              type={confirmation.type as 'modify' | 'delete' | 'create'}
                              confirmation={confirmation}
                              onApprove={() => handleApprove(toolCallId, confirmation)}
                              onReject={() => handleReject(toolCallId)}
                              isExecuting={false}
                            />
                          )}
                          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-800">
                              Error: {errorMessage || 'Unknown error'}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Render confirmation UI (pending or executing)
                    if (confirmation.type === 'bulk-delete') {
                      return (
                        <BulkConfirmation
                          key={toolCallId}
                          type={confirmation.type}
                          confirmation={confirmation}
                          onApprove={(selectedIds) =>
                            handleBulkApprove(toolCallId, confirmation, selectedIds)
                          }
                          onReject={() => handleReject(toolCallId)}
                          isExecuting={state === 'executing'}
                        />
                      );
                    } else {
                      return (
                        <CommandConfirmation
                          key={toolCallId}
                          type={confirmation.type as 'modify' | 'delete' | 'create'}
                          confirmation={confirmation}
                          onApprove={() => handleApprove(toolCallId, confirmation)}
                          onReject={() => handleReject(toolCallId)}
                          isExecuting={state === 'executing'}
                        />
                      );
                    }
                  }
                }

                // Fallback: render raw JSON for unknown tool results
                return (
                  <div
                    key={toolCallId}
                    className="max-w-[80%] overflow-wrap break-words rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-zinc-600">Tool Result</p>
                    <pre className="mt-1 overflow-x-auto text-xs text-zinc-800">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                );
              })}
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
