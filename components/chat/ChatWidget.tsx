'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useState, FormEvent, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X, Square, Clock, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatHistory } from './ChatHistory';
import {
  loadChatMessages,
  saveChatMessages,
  isNewSession,
} from '@/lib/chat/persistence';

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [displayError, setDisplayError] = useState<string | null>(null);
  const router = useRouter();
  
  // Track message count to detect failed responses
  const prevMessageCountRef = useRef(0);
  const wasLoadingRef = useRef(false);

  // Load messages BEFORE useChat initialization to prevent race condition
  const [initialMessages] = useState(() => {
    if (typeof window === 'undefined') return [];
    isNewSession(); // Check and clear if new session
    return loadChatMessages();
  });

  // Create chat transport with timeout and error handling
  const transport = new DefaultChatTransport({
    api: '/api/chat',
    fetch: async (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        // Check for error responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      }
    },
  });

  // Initialize useChat with preloaded messages
  const { messages, sendMessage, stop, setMessages, status, error } = useChat({
    transport,
    initialMessages, // KEY FIX: Initialize with messages from localStorage
    onError: (err) => {
      console.error('Chat error:', err);
      setDisplayError(err.message || 'An error occurred. Please try again.');
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Stable callback for operation completion (triggers calendar refresh)
  const handleOperationComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  // Detect when streaming completes without a response (silent failures)
  useEffect(() => {
    // If we were loading and now we're not
    if (wasLoadingRef.current && !isLoading) {
      // Check if the latest assistant message has any content (text or tool results)
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];
      
      // A response is valid if it has text OR tool results
      const hasValidResponse = lastAssistantMsg && lastAssistantMsg.parts && lastAssistantMsg.parts.some(
        (p: any) => (p.type === 'text' && p.text?.trim()) || p.type === 'tool-result'
      );
      
      const userMessages = messages.filter(m => m.role === 'user').length;
      
      // If user sent a message but no valid assistant response came back
      if (userMessages > assistantMessages.length && !hasValidResponse && !error) {
        setDisplayError('No response received. The AI service may be temporarily unavailable. Please try again.');
      }
    }
    
    wasLoadingRef.current = isLoading;
    prevMessageCountRef.current = messages.length;
  }, [isLoading, messages, error]);

  // Sync error state
  useEffect(() => {
    if (error) {
      setDisplayError(error.message || 'An error occurred. Please try again.');
    }
  }, [error]);

  // Clear error when user sends a new message
  const clearError = useCallback(() => {
    setDisplayError(null);
  }, []);

  // Debug: Log message structure to understand part types
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('[ChatWidget] Last message:', JSON.stringify(lastMessage, null, 2));
      if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
        console.log('[ChatWidget] Message parts types:', lastMessage.parts.map((p: any) => ({
          type: p.type,
          hasResult: 'result' in p,
          hasToolCallId: 'toolCallId' in p,
          hasToolName: 'toolName' in p,
          keys: Object.keys(p),
        })));
      }
    }
  }, [messages]);

  // Save messages to localStorage when they change (after streaming completes)
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      saveChatMessages(messages);
    }
  }, [messages, isLoading]);

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Clear any previous errors
    clearError();

    // Send message with text part
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: input }],
    });

    // Clear input
    setInput('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* Floating chat button */}
      <Dialog.Trigger asChild>
        <button className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform hover:scale-105 hover:bg-zinc-800">
          <MessageCircle className="h-6 w-6" />
        </button>
      </Dialog.Trigger>

      {/* Dialog overlay and content */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-50 flex h-[80vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] flex-col rounded-lg border border-zinc-200 bg-white shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:h-[80vh] sm:w-[90vw]"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="border-b border-zinc-200">
            <div className="flex items-center justify-between px-6 py-4">
              <Dialog.Title className="text-lg font-semibold text-zinc-900">
                AI Assistant
              </Dialog.Title>
              <div className="flex items-center gap-2">
                {isLoading && activeTab === 'chat' && (
                  <button
                    onClick={stop}
                    className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-zinc-600 hover:bg-zinc-100"
                  >
                    <Square className="h-3 w-3" />
                    Stop
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex border-t border-zinc-200">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Clock className="h-4 w-4" />
                History
              </button>
            </div>
          </div>

          {/* Content area */}
          {activeTab === 'chat' ? (
            <>
              {/* Error display */}
              {displayError && (
                <div className="mx-4 mt-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium">Error</p>
                    <p className="mt-0.5">{displayError}</p>
                  </div>
                  <button 
                    onClick={clearError}
                    className="flex-shrink-0 rounded p-1 hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Messages area */}
              <ChatMessages messages={messages} isLoading={isLoading} onOperationComplete={handleOperationComplete} />

              {/* Input area */}
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </>
          ) : (
            <ChatHistory onOperationComplete={handleOperationComplete} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
