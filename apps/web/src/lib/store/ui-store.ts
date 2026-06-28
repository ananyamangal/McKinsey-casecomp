"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  notificationsOpen: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleNotifications: () => void;
  setNotificationsOpen: (value: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebar: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      notificationsOpen: false,
      mobileSidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen })),
      setNotificationsOpen: (value) => set({ notificationsOpen: value }),
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      setMobileSidebar: (value) => set({ mobileSidebarOpen: value }),
    }),
    {
      name: "halo-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
