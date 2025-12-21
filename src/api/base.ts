const raw = (import.meta.env.VITE_API_BASE ?? "").trim();

export const API_BASE = raw;

export function apiUrl(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}
