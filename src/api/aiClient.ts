import { apiUrl } from "./base";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function chat(messages: ChatMessage[], contextDocIds: number[]) {
  const res = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, contextDocIds }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Chat failed: ${res.status}`);
  }

  return res.json();
}
