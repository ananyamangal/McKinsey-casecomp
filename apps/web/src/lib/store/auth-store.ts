"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginRequest, meRequest } from "@/lib/api/http";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  dealershipId: string;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * The app has no login screen — it auto-authenticates with the default
 * operator account. Override via env for a different default identity.
 */
export const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "owner@apexmotors.in";
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "password";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  login: (email: string, password: string) => Promise<void>;
  /** Sign in with the default operator account (no login screen). */
  autoLogin: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: "loading",
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setStatus: (status) => set({ status }),
      login: async (email, password) => {
        const tokens = await loginRequest(email, password);
        set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        const user = await meRequest();
        set({ user, status: "authenticated" });
      },
      autoLogin: async () => {
        try {
          await get().login(DEMO_EMAIL, DEMO_PASSWORD);
        } catch (err) {
          set({ accessToken: null, refreshToken: null, user: null, status: "unauthenticated" });
          throw err;
        }
      },
      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, status: "unauthenticated" }),
    }),
    {
      name: "halo-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    },
  ),
);

/**
 * Non-React accessors so the HTTP layer can read/refresh tokens outside of
 * components without subscribing to the store.
 */
export const authStore = {
  getState: useAuthStore.getState,
  setState: useAuthStore.setState,
};
