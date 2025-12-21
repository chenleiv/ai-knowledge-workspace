// src/api/documentsClient.ts
import { apiUrl } from "./base";

export type DocumentItem = {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
};

export type DocumentInput = Omit<DocumentItem, "id">;

async function readJson<T>(res: Response): Promise<T> {
  // DELETE 204 (No Content) or empty body
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (res.ok) {
    if (!isJson) {
      // if backend ever returns plain text successfully
      const text = await res.text();
      return text as unknown as T;
    }
    return (await res.json()) as T;
  }

  // error branch
  const errorText = isJson
    ? JSON.stringify(await res.json())
    : await res.text();
  throw new Error(errorText || `Request failed: ${res.status}`);
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(apiUrl("/api/documents"));
  return readJson<DocumentItem[]>(res);
}

export async function getDocument(id: number): Promise<DocumentItem> {
  const res = await fetch(apiUrl(`/api/documents/${id}`));
  return readJson<DocumentItem>(res);
}

export async function createDocument(
  input: DocumentInput
): Promise<DocumentItem> {
  const res = await fetch(apiUrl("/api/documents"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<DocumentItem>(res);
}

export async function updateDocument(
  id: number,
  input: DocumentInput
): Promise<DocumentItem> {
  const res = await fetch(apiUrl(`/api/documents/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<DocumentItem>(res);
}

export async function deleteDocument(id: number): Promise<{ ok: true }> {
  const res = await fetch(apiUrl(`/api/documents/${id}`), { method: "DELETE" });
  if (res.status === 204) return { ok: true };
  await readJson<unknown>(res); // will throw if not ok
  return { ok: true };
}

export async function exportDocuments(): Promise<unknown> {
  const res = await fetch(apiUrl("/api/documents/export"));
  return readJson<unknown>(res);
}

export async function importDocumentsBulk(
  mode: "merge" | "replace",
  documents: unknown
): Promise<unknown> {
  const res = await fetch(apiUrl("/api/documents/import-bulk"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, documents }),
  });
  return readJson<unknown>(res);
}
