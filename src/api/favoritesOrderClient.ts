import { apiFetch } from "./base";

export type FavoritesOrderResponse = { order: number[] };

export function getFavoritesOrder() {
  return apiFetch<FavoritesOrderResponse>("/api/favorites/order");
}

export function saveFavoritesOrder(order: number[]) {
  return apiFetch<{ ok: true }>("/api/favorites/order", {
    method: "PUT",
    body: JSON.stringify({ order }),
  });
}
