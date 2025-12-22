import { apiFetch } from "./base";

export type Role = "admin" | "viewer";
export type AuthUser = { email: string; role: Role };

export type LoginResponse = { user: AuthUser };

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return apiFetch<AuthUser>("/api/auth/me");
}

export function logout() {
  return apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}
