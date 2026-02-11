import { apiFetch } from "./base";
import { type DocumentItem } from "./documentsClient";

export interface ChatResponse {
  answer: string;
  sources: { id: number; title: string }[];
}

export async function chatWithAI(message: string, context: DocumentItem[]): Promise<ChatResponse> {
  return await apiFetch<ChatResponse>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, context }),
  });
}
