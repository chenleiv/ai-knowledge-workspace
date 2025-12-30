import type { AuthUser } from "./authTypes";
import { AUTH_USER_KEY } from "./authTypes";

export function loadUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveUserToStorage(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearUserFromStorage() {
  localStorage.removeItem(AUTH_USER_KEY);
}
