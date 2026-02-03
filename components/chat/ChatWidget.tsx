'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X, Square, Clock } from 'lucide-react';
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
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const router = useRouter();

  // Create chat transport
  const transport = new DefaultChatTransport({
    api: '/api/chat',
  });

  // Initialize useChat with transport
  const { messages, sendMessage, stop, setMessages, status } = useChat({
    transport,
  });

  const isLoading = status === 'streaming';

  // Stable callback for operation completion (triggers calendar refresh)
  const handleOperationComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  // Load messages from localStorage on mount
  useEffect(() => {
    // Check if new session and clear if needed
    isNewSession();

    // Load persisted messages
    const persistedMessages = loadChatMessages();
    if (persistedMessages.length > 0) {
      setMessages(persistedMessages);
    }
    setInitialMessagesLoaded(true);
  }, [setMessages]);

  // Save messages to localStorage when they change (after streaming completes)
  useEffect(() => {
    if (initialMessagesLoaded && !isLoading && messages.length > 0) {
      saveChatMessages(messages);
    }
  }, [messages, isLoading, initialMessagesLoaded]);

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
