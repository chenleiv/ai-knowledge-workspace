import { getApiBase } from "./config";

export async function downloadExport(): Promise<void> {
  const base = getApiBase();
  const url = `${base}/api/documents/export`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Export failed: ${res.status} ${text}`);
  }

  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = downloadUrl;

  const filename =
    res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ??
    "documents-export.json";

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(downloadUrl);
}
