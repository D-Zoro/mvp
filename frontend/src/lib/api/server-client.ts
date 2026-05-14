import { cookies } from "next/headers";
import { TOKEN_KEYS } from "@/lib/auth/tokens";

function apiPrefix() {
  const prefix = process.env.BACKEND_API_PREFIX ?? "/api/v1";
  return prefix.startsWith("/") ? prefix : `/${prefix}`;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: unknown,
  ) {
    super(message);
  }
}

export function backendUrl(path: string) {
  const base = process.env.BACKEND_URL ?? "http://localhost:8000";
  const prefix = apiPrefix();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized.startsWith(prefix) ? normalized : `${prefix}${normalized}`}`;
}

export async function serverFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEYS.access)?.value;
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(backendUrl(path), {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    throw new ApiRequestError(response.statusText || "API request failed", response.status, payload);
  }
  return payload as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
