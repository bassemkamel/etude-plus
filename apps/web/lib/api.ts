export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parse(res: Response) {
  return res.json().catch(() => ({}));
}

export async function api<T = any>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const hasBody = init.body !== undefined && init.body !== null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await parse(res);
  if (res.status === 401 && !retried && !path.includes("/auth/login") && !path.includes("/auth/register") && !path.includes("/auth/refresh")) {
    const refreshed = await fetch(`${API_URL}/api/v1/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) return api<T>(path, init, true);
  }
  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? "ERROR", data.message ?? data.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}
