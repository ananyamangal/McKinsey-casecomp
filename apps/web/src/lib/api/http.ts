import { authStore, type AuthUser } from "@/lib/store/auth-store";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Token envelope returned by /auth/login and /auth/refresh. */
export interface TokenEnvelope {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Params;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  /** Internal: prevents recursive refresh loops. */
  _retried?: boolean;
}

function buildQuery(params?: Params): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      return JSON.stringify(detail);
    }
    return res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

/**
 * The auth store is a vanilla store handle, so it can be read/updated outside of
 * React. The static import is a runtime circular reference (auth-store imports
 * loginRequest/meRequest from here), but it is only dereferenced at call time —
 * never during module evaluation — so it resolves cleanly under ES modules.
 */

/**
 * Recover an expired session without a login screen: first try the refresh
 * token, then fall back to a fresh auto-login with the default account.
 * Returns a usable access token or null.
 */
async function tryReauth(): Promise<string | null> {
  const refreshToken = authStore.getState().refreshToken;
  if (refreshToken) {
    try {
      const tokens = await refreshRequest(refreshToken);
      authStore.getState().setTokens(tokens.access_token, tokens.refresh_token);
      return tokens.access_token;
    } catch {
      // Refresh failed — fall through to auto-login.
    }
  }
  try {
    await authStore.getState().autoLogin();
    return authStore.getState().accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, auth = true, _retried = false } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = authStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && auth && !_retried) {
    const newToken = await tryReauth();
    if (newToken) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    authStore.getState().setStatus("unauthenticated");
    throw new ApiError(401, "Session could not be established.");
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth-specific requests --------------------------------------------------

/** POST /auth/login — OAuth2 form-urlencoded body. */
export async function loginRequest(email: string, password: string): Promise<TokenEnvelope> {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  return (await res.json()) as TokenEnvelope;
}

/** POST /auth/refresh — JSON body. */
export async function refreshRequest(refreshToken: string): Promise<TokenEnvelope> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  return (await res.json()) as TokenEnvelope;
}

/** GET /auth/me — returns snake_case; map it to the frontend AuthUser shape. */
export async function meRequest(): Promise<AuthUser> {
  const me = await apiFetch<{
    id: string;
    email: string;
    full_name: string;
    dealership_id: string;
    roles: string[];
  }>("/auth/me");
  return {
    id: me.id,
    email: me.email,
    fullName: me.full_name,
    dealershipId: me.dealership_id,
    roles: me.roles ?? [],
  };
}
