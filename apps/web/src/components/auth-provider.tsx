"use client";

import * as React from "react";
import { meRequest } from "@/lib/api/http";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * Bootstraps the session with no login screen: on mount it reuses an existing
 * token (validating it via /auth/me) and otherwise silently signs in with the
 * default operator account. If the API is unreachable, status becomes
 * 'unauthenticated' so the guard can show a retry.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const autoLogin = useAuthStore((s) => s.autoLogin);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      const token = useAuthStore.getState().accessToken;
      if (token) {
        try {
          const user = await meRequest();
          if (!cancelled) {
            setUser(user);
            setStatus("authenticated");
          }
          return;
        } catch {
          // Stale/expired token — fall through to a fresh auto-login.
        }
      }
      if (!cancelled) {
        await autoLogin().catch(() => {
          /* autoLogin already set status to 'unauthenticated' */
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
