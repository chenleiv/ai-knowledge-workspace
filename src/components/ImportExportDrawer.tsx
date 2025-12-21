import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentItem } from "../api/documentsClient";
import { exportDocuments, importDocumentsBulk } from "../api/documentsClient";
import "./importExportDrawer.scss";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void; // call load() in DocumentsPage after import
};

type ImportMode = "merge" | "replace";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export default function ImportExportDrawer({
  isOpen,
  onClose,
  onImported,
}: Props) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);

  const [mode, setMode] = useState<ImportMode>("merge");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    window.setTimeout(() => {
      firstFocusRef.current?.focus();
    }, 0);

    function getFocusable(): HTMLElement[] {
      const root = drawerRef.current;
      if (!root) return [];

      const nodes = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      return Array.from(nodes).filter((el) => {
        const disabled =
          (el as HTMLButtonElement).disabled ||
          el.getAttribute("aria-disabled") === "true";
        const hidden = el.getAttribute("aria-hidden") === "true";
        return !disabled && !hidden && el.offsetParent !== null;
      });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusable();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active) return;

      if (!drawerRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);

      // Restore focus to the element that opened the drawer
      window.setTimeout(() => {
        previouslyFocusedRef.current?.focus?.();
      }, 0);
    };
  }, [isOpen, onClose]);

  const replaceWarning = useMemo(() => mode === "replace", [mode]);

  const firstFieldRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      firstFieldRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  async function handleExport() {
    setIsWorking(true);
    setError(null);

    try {
      const docs = await exportDocuments();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadJson(`documents-export-${stamp}.json`, docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsWorking(false);
    }
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  async function handlePickFile(file: File) {
    setError(null);
    try {
      const text = await readFileAsText(file);
      setJsonText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read file");
    }
  }

  function parseDocuments(text: string): DocumentItem[] {
    const raw = JSON.parse(text);

    // expected: array of documents
    if (!Array.isArray(raw))
      throw new Error("Invalid JSON: expected an array of documents");

    // minimal validation
    return raw.map((x, idx) => {
      if (typeof x !== "object" || x === null)
        throw new Error(`Invalid document at index ${idx}`);

      const doc = x as Partial<DocumentItem>;
      if (typeof doc.id !== "number")
        throw new Error(`Missing/invalid 'id' at index ${idx}`);
      if (typeof doc.title !== "string")
        throw new Error(`Missing/invalid 'title' at index ${idx}`);
      if (typeof doc.category !== "string")
        throw new Error(`Missing/invalid 'category' at index ${idx}`);
      if (typeof doc.summary !== "string")
        throw new Error(`Missing/invalid 'summary' at index ${idx}`);
      if (typeof doc.content !== "string")
        throw new Error(`Missing/invalid 'content' at index ${idx}`);

      return doc as DocumentItem;
    });
  }

  async function handleImport() {
    setIsWorking(true);
    setError(null);

    try {
      const docs = parseDocuments(jsonText.trim());
      await importDocumentsBulk(mode, docs);
      setJsonText("");
      onImported();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsWorking(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onMouseDown={onClose} role="presentation">
      <div
        className="drawer"
        ref={drawerRef}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Import / Export"
      >
        <div className="drawer-header">
          <div>
            <h3>Import / Export</h3>
            <p className="subtitle">
              Export a backup JSON, or import documents from JSON.
            </p>
          </div>

          <button
            ref={firstFocusRef}
            type="button"
            className="icon-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && <div className="drawer-error">{error}</div>}

        <section className="drawer-section">
          <h4>Export</h4>
          <p className="hint">Download the current documents as a JSON file.</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleExport}
            disabled={isWorking}
          >
            {isWorking ? "Working..." : "Export JSON"}
          </button>
        </section>

        <section className="drawer-section">
          <h4>Import</h4>
          <p className="hint">
            Paste JSON or upload a JSON file containing an array of documents.
          </p>

          <div className="mode-row">
            <label className={`mode-pill ${mode === "merge" ? "active" : ""}`}>
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
              />
              Merge
            </label>

            <label
              className={`mode-pill ${
                mode === "replace" ? "active danger" : ""
              }`}
            >
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              Replace
            </label>
          </div>

          {replaceWarning && (
            <div className="danger-note">
              Warning: Replace will delete existing documents and import the
              JSON as the new source of truth.
            </div>
          )}

          <label className="file-pick">
            Upload JSON
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePickFile(file);
                e.currentTarget.value = "";
              }}
              disabled={isWorking}
              hidden
            />
          </label>

          <textarea
            value={jsonText}
            ref={firstFieldRef}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='Paste JSON here (example: [{"id":1,"title":"...","category":"...","summary":"...","content":"..."}])'
            rows={10}
            disabled={isWorking}
          />

          <div className="import-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setJsonText("")}
              disabled={isWorking || !jsonText}
            >
              Clear
            </button>

            <button
              type="button"
              className={`primary-btn ${mode === "replace" ? "danger" : ""}`}
              onClick={handleImport}
              disabled={isWorking || jsonText.trim().length === 0}
            >
              {isWorking
                ? "Importing..."
                : mode === "replace"
                ? "Import (Replace)"
                : "Import (Merge)"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
