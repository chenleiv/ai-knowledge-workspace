import { getApiBase } from "./config";

export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").trim();

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export class ApiError extends Error {
  status: number;
  bodyText?: string;

  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
  }
}

function readToken(): string | null {
  return localStorage.getItem("authToken");
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  // Only set Content-Type when there's a body (avoid issues with FormData later)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (res.status === 204) {
    // @ts-expect-error - caller expects T, but 204 has no body
    return undefined;
  }

  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(
      `Request failed: ${res.status}`,
      res.status,
      text || undefined
    );
  }

  return (text ? JSON.parse(text) : null) as T;
}
