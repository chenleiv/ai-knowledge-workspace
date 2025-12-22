import { apiFetch } from "./base";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResponse = {
  role: "assistant";
  text: string;
  sources?: Array<{ id: number; title: string; snippet: string }>;
};

export function chat(messages: ChatMessage[], contextDocIds: number[]) {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages, contextDocIds }),
  });
}
