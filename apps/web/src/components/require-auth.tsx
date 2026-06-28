"use client";

import * as React from "react";
import { Gauge } from "lucide-react";
import { Button } from "@halo/ui";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * App-shell gate. There is no login screen: the session is established
 * automatically by AuthProvider. While that resolves we show a loader; if the
 * API is unreachable we offer a retry instead of redirecting anywhere.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const autoLogin = useAuthStore((s) => s.autoLogin);

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Gauge className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Can&apos;t reach Halo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The API isn&apos;t responding. Make sure it&apos;s running on port 8000.
          </p>
        </div>
        <Button size="sm" onClick={() => void autoLogin().catch(() => {})}>
          Retry
        </Button>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Gauge className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  return <>{children}</>;
}
