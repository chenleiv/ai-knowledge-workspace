// src/api/base.ts
import { getApiBase } from "./config";

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
  return localStorage.getItem("authToken"); // חייב להתאים ל-AuthProvider
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (res.status === 204) {
    return undefined as T;
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
