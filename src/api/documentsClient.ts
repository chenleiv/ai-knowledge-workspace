// src/api/documentsClient.ts
import { apiUrl } from "./base";
import { authHeaders } from "./auth";

export type DocumentItem = {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
};

export type DocumentInput = Omit<DocumentItem, "id">;

async function readJson<T>(res: Response): Promise<T> {
  // 204 No Content
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const text = await res.text();

  if (!res.ok) {
    // try to show a useful error message
    if (isJson && text) {
      try {
        const parsed = JSON.parse(text);
        throw new Error(
          typeof parsed === "string" ? parsed : JSON.stringify(parsed)
        );
      } catch {
        // fallthrough
      }
    }
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (!text) return undefined as T;
  if (!isJson) return text as unknown as T;

  return JSON.parse(text) as T;
}

// ---- READ (usually allowed for both admin+viewer) ----
export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(apiUrl("/api/documents"), {
    headers: { ...authHeaders() }, // <-- important if backend requires login
  });
  return readJson<DocumentItem[]>(res);
}

export async function getDocument(id: number): Promise<DocumentItem> {
  const res = await fetch(apiUrl(`/api/documents/${id}`), {
    headers: { ...authHeaders() },
  });
  return readJson<DocumentItem>(res);
}

// ---- WRITE (admin only) ----
export async function createDocument(
  input: DocumentInput
): Promise<DocumentItem> {
  const res = await fetch(apiUrl("/api/documents"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return readJson<DocumentItem>(res);
}

export async function deleteDocument(id: number): Promise<{ ok: true }> {
  const res = await fetch(apiUrl(`/api/documents/${id}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  if (res.status === 204) return { ok: true }; // success

  await readJson<unknown>(res);
  return { ok: true };
}

// ---- Admin tools (usually admin only) ----
export async function exportDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(apiUrl("/api/documents/export"), {
    headers: { ...authHeaders() }, // <-- add if you want to restrict
  });
  return readJson<DocumentItem[]>(res);
}

export async function importDocumentsBulk(
  mode: "merge" | "replace",
  documents: DocumentItem[]
): Promise<DocumentItem[]> {
  const res = await fetch(apiUrl("/api/documents/import-bulk"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ mode, documents }),
  });
  return readJson<DocumentItem[]>(res);
}
