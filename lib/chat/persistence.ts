import type { UIMessage } from 'ai';

// Storage keys
const CHAT_STORAGE_KEY = 'almanac-chat-messages';
const CHAT_SESSION_KEY = 'almanac-chat-session';

/**
 * Load chat messages from localStorage.
 * Returns empty array if not found or on error.
 */
export function loadChatMessages(): UIMessage[] {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as UIMessage[];
  } catch (error) {
    console.warn('Failed to load chat messages from localStorage:', error);
    return [];
  }
}

/**
 * Save chat messages to localStorage.
 * Saves ALL messages including tool results for confirmation state preservation.
 */
export function saveChatMessages(messages: UIMessage[]): void {
  try {
    // Save ALL messages including tool results to preserve confirmation dialogs
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to save chat messages to localStorage:', error);
  }
}

/**
 * Clear chat messages from localStorage.
 */
export function clearChatMessages(): void {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear chat messages from localStorage:', error);
  }
}

/**
 * Check if this is a new browser session.
 * Uses sessionStorage to track session lifespan.
 * If new session: clears old messages and returns true.
 * If existing session: returns false (keep messages).
 */
export function isNewSession(): boolean {
  try {
    const sessionExists = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!sessionExists) {
      // New session - set marker and clear old messages
      sessionStorage.setItem(CHAT_SESSION_KEY, 'active');
      clearChatMessages();
      return true;
    }
    // Existing session - keep messages
    return false;
  } catch (error) {
    console.warn('Failed to check session status:', error);
    return false;
  }
}
