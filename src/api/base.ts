export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").trim();

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}
