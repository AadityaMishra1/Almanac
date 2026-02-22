import { create } from "zustand";

interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "read" | "createdAt">,
  ) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },
}));

// ─── Chat Store ─────────────────────────────────────────────────────────────
// Messages and loading state are now managed by the AI SDK's useChat hook.
// This store only tracks panel open/close and calendar refresh versioning.

type PanelSize = "compact" | "expanded" | "fullscreen";

interface ChatState {
  isOpen: boolean;
  panelSize: PanelSize;
  calendarVersion: number;
  highlightedEventIds: Set<string>;
  toggleChat: () => void;
  setOpen: (open: boolean) => void;
  setPanelSize: (size: PanelSize) => void;
  bumpCalendarVersion: () => void;
  highlightEvents: (ids: string[]) => void;
  clearHighlights: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  panelSize: "compact",
  calendarVersion: 0,
  highlightedEventIds: new Set(),
  toggleChat: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      // Reset to compact when closing via toggle
      ...(!state.isOpen ? {} : { panelSize: "compact" as PanelSize }),
    })),
  setOpen: (open) => {
    if (open) {
      set({ isOpen: true });
    } else {
      // Reset to compact on close
      set({ isOpen: false, panelSize: "compact" });
    }
  },
  setPanelSize: (size) => set({ panelSize: size }),
  bumpCalendarVersion: () =>
    set((state) => ({ calendarVersion: state.calendarVersion + 1 })),
  highlightEvents: (ids) => set({ highlightedEventIds: new Set(ids) }),
  clearHighlights: () => set({ highlightedEventIds: new Set() }),
}));
