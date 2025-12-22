import { getApiBase } from "./config";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function chat(messages: ChatMessage[], contextDocIds: number[]) {
  const base = getApiBase();

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ messages, contextDocIds }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Chat failed: ${res.status}`);
  }

  return res.json();
}
