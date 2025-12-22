import { apiFetch } from "./base";
import type { AuthUser } from "../auth/Auth";

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

export async function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function me() {
  return apiFetch<AuthUser>("/api/auth/me");
}
