/**
 * Shared authenticated fetch utility.
 *
 * Guarantees:
 *  - Always sends credentials (cookie session) and Bearer token when present.
 *  - 401 → clears the stale token, redirects to /login, returns null.
 *  - 4xx/5xx → logs the status + body to the console, returns null.
 *  - Network error → logs, reports to Sentry, returns null.
 *  - Never throws to the caller; pages receive null and render an empty/error state.
 *
 * Usage:
 *   const data = await apiFetch<MyType>("/api/some/endpoint");
 *   if (!data) return; // auth failed or server error — already handled
 */

import * as Sentry from "@sentry/react";
import { getToken, clearToken } from "@workspace/api-client-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T | null> {
  const token = getToken();

  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/api/") ? path.slice(4) : path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers as Record<string, string> | undefined ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    // Pure network error (offline, DNS failure, CORS abort, etc.)
    console.error("[api] network error", url, err);
    Sentry.captureException(err, { extra: { url, method: options.method ?? "GET" } });
    return null;
  }

  if (response.status === 401) {
    // Token is stale or missing — wipe it so the next apiFetch doesn't retry it,
    // then send the user back to the login page.
    clearToken();
    console.warn("[api] 401 on", url, "— redirecting to /login");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return null;
  }

  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch { /* ignore */ }
    console.warn("[api] HTTP", response.status, url, body.slice(0, 200));
    // Only report unexpected server errors (5xx) to Sentry; 4xx are app-logic issues.
    if (response.status >= 500) {
      Sentry.captureMessage(`HTTP ${response.status} on ${url}`, {
        level: "error",
        extra: { body: body.slice(0, 500) },
      });
    }
    return null;
  }

  // 204 No Content — valid empty success
  if (response.status === 204) return null;

  try {
    return (await response.json()) as T;
  } catch (err) {
    console.error("[api] JSON parse error", url, err);
    Sentry.captureException(err, { extra: { url } });
    return null;
  }
}

/**
 * Same as apiFetch but asserts the result is an array.
 * Returns [] instead of null so callers can always call .map()/.filter().
 */
export async function apiFetchArray<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T[]> {
  const data = await apiFetch<unknown>(path, options);
  if (data === null) return [];
  if (Array.isArray(data)) return data as T[];
  // Unwrap { items: [...] } or { data: [...] } envelope shapes
  if (data && typeof data === "object") {
    for (const key of ["items", "data", "results", "rows", "folders"] as const) {
      const val = (data as Record<string, unknown>)[key];
      if (Array.isArray(val)) return val as T[];
    }
  }
  console.warn("[api] expected array, got:", data);
  return [];
}
