import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import "./documentsPage.scss";
import {
  deleteDocument,
  listDocuments,
  type DocumentItem,
  exportDocuments,
  importDocumentsBulk,
} from "../../api/documentsClient";
import useConfirm from "../../hooks/useConfirm";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DragOverlay } from "@dnd-kit/core";

import DocumentsHeader from "./components/DocumentsHeader";
import SortableDocumentCard from "./components/SortableDocumentCard";
import {
  applyOrder,
  normalizeOrder,
  makePreview,
  sameArray,
} from "./utils/ordering";
import { loadJson, saveJson } from "./utils/storage";

const ORDER_KEY = "documentsOrder";
const FAVORITES_KEY = "documentsFavorites";

function normalizeImportedDocuments(
  parsed: unknown
): Record<string, unknown>[] {
  const isObj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);

  const toObjArray = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? v.filter(isObj) : [];

  if (Array.isArray(parsed)) return toObjArray(parsed);

  if (isObj(parsed)) return toObjArray(parsed.documents);

  return [];
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<number[]>(
    loadJson<number[]>(ORDER_KEY, [])
  );
  const [favorites, setFavorites] = useState<Record<number, boolean>>(
    loadJson<Record<number, boolean>>(FAVORITES_KEY, {})
  );

  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listDocuments();
      setDocs(data);

      const nextOrder = normalizeOrder(order, data);
      if (!sameArray(nextOrder, order)) {
        setOrder(nextOrder);
        saveJson(ORDER_KEY, nextOrder);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }, [order]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(); // initial data fetch
  }, [load]);

  function openDoc(doc: DocumentItem) {
    navigate(`/documents/${doc.id}`);
  }

  function openCreate() {
    navigate("/documents/new");
  }

  async function onDelete(doc: DocumentItem) {
    const ok = await confirm({
      title: "Delete document",
      message: `Are you sure you want to delete "${doc.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (!ok) return;

    setError(null);

    try {
      await deleteDocument(doc.id);

      setDocs((prev) => prev.filter((d) => d.id !== doc.id));

      setOrder((prev) => {
        const next = prev.filter((id) => id !== doc.id);
        saveJson(ORDER_KEY, next);
        return next;
      });

      setFavorites((prev) => {
        const next = { ...prev };
        delete next[doc.id];
        saveJson(FAVORITES_KEY, next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      saveJson(FAVORITES_KEY, next);
      return next;
    });
  }

  function toggleCardMenu(id: number) {
    setOpenMenuId((prev) => (prev === id ? null : id));
  }

  const orderedDocs = useMemo(() => applyOrder(docs, order), [docs, order]);

  const filteredDocs = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = orderedDocs;

    if (showFavoritesOnly) result = result.filter((d) => favorites[d.id]);
    if (!q) return result;

    return result.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [query, orderedDocs, showFavoritesOnly, favorites]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as number);
      const newIndex = prev.indexOf(over.id as number);
      const next = arrayMove(prev, oldIndex, newIndex);
      saveJson(ORDER_KEY, next);
      return next;
    });
  }

  async function onExport() {
    const data = await exportDocuments();

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "documents.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function requestImport(mode: "merge" | "replace") {
    if (mode === "replace") {
      const ok = await confirm({
        title: "Replace all documents?",
        message:
          "This will delete all existing documents and replace them with the imported file. This action cannot be undone.",
        confirmLabel: "Replace",
        cancelLabel: "Cancel",
        variant: "danger",
      });

      if (!ok) return;
    }

    await onImport(mode);
  }

  async function onImport(mode: "merge" | "replace") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;

        const text = await file.text();
        const parsed = JSON.parse(text);
        const documents = normalizeImportedDocuments(parsed);

        if (!Array.isArray(documents) || documents.length === 0) {
          setError(
            'Import file must be a JSON array of documents (or { "documents": [...] }).'
          );
          return;
        }

        await importDocumentsBulk(mode, documents);
        await load();
        setPageMenuOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    };

    input.click();
  }

  return (
    <div className="documents-page" role="presentation">
      <DocumentsHeader
        onNew={openCreate}
        pageMenuOpen={pageMenuOpen}
        onTogglePageMenu={() => {
          setOpenMenuId(null);
          setPageMenuOpen((v) => !v);
        }}
        onClosePageMenu={() => setPageMenuOpen(false)}
        onExport={() => void onExport()}
        onImport={(mode) => void requestImport(mode)}
      />

      {error && <div className="error">{error}</div>}

      <div className="search-row" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          placeholder="Search title, category, summary, content..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <label className="favorites-toggle">
          <input
            type="checkbox"
            checked={showFavoritesOnly}
            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
          />
          Favorites only
        </label>
      </div>

      <div className="section">
        <div className="section-title">All documents</div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) =>
            setActiveDragId(e.active.id as number)
          }
          onDragCancel={() => setActiveDragId(null)}
          onDragEnd={(e) => {
            onDragEnd(e);
            setActiveDragId(null);
          }}
        >
          <SortableContext
            items={filteredDocs.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="docs-grid">
              {filteredDocs.map((doc) => (
                <SortableDocumentCard
                  key={doc.id}
                  doc={doc}
                  isFavorite={!!favorites[doc.id]}
                  isMenuOpen={openMenuId === doc.id}
                  onToggleFavorite={toggleFavorite}
                  onOpen={openDoc}
                  onDelete={onDelete}
                  onToggleMenu={toggleCardMenu}
                  onCloseMenu={() => setOpenMenuId(null)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeDragId != null ? (
              <div className="drag-overlay">
                {(() => {
                  const doc = docs.find((d) => d.id === activeDragId);
                  if (!doc) return null;
                  return (
                    <div className="doc-card is-overlay">
                      <div className="doc-card-header">
                        <div className="drag-handle">⠿</div>
                        <div className="doc-header-main">
                          <h3 className="doc-title">{doc.title}</h3>
                          <div className="doc-meta">{doc.category}</div>
                        </div>
                        <div className="doc-actions">
                          <div
                            className={`icon-btn ${
                              favorites[doc.id] ? "active" : ""
                            }`}
                          >
                            {favorites[doc.id] ? "★" : "☆"}
                          </div>
                        </div>
                      </div>
                      <p className="doc-preview">{makePreview(doc, 160)}</p>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {filteredDocs.length === 0 && (
        <p className="empty">No documents found.</p>
      )}
    </div>
  );
}
