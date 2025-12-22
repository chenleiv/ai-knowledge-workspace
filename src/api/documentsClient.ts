// src/api/documentsClient.ts
import { apiFetch } from "./base";

export type DocumentItem = {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
};

export type DocumentInput = Omit<DocumentItem, "id">;

export function listDocuments() {
  return apiFetch<DocumentItem[]>("/api/documents");
}

export function getDocument(id: number) {
  return apiFetch<DocumentItem>(`/api/documents/${id}`);
}

export function createDocument(input: DocumentInput) {
  return apiFetch<DocumentItem>("/api/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDocument(id: number, input: DocumentInput) {
  return apiFetch<DocumentItem>(`/api/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteDocument(id: number) {
  await apiFetch<void>(`/api/documents/${id}`, { method: "DELETE" });
  return { ok: true as const };
}

export function exportDocuments() {
  return apiFetch<DocumentItem[]>("/api/documents/export");
}

export function importDocumentsBulk(
  mode: "merge" | "replace",
  documents: DocumentItem[]
) {
  return apiFetch<DocumentItem[]>("/api/documents/import-bulk", {
    method: "POST",
    body: JSON.stringify({ mode, documents }),
  });
}
