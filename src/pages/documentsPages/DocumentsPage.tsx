import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import "./documentsPage.scss";

import {
  deleteDocument,
  importDocumentsBulk,
  listDocuments,
  type DocumentItem,
} from "../../api/documentsClient";

import useConfirm from "../../hooks/useConfirm";
import DocumentsHeader from "./components/DocumentsHeader";
import SortableDocumentCard from "./components/SortableDocumentCard";
import InlineBanner from "../../components/banners/InlineBanner";
import { useAuth } from "../../auth/useAuth";

import { downloadExport } from "../../api/downloadExport";
import { normalizeImportedDocuments } from "./utils/documentsPageHelpers";
import {
  applyOrder,
  makePreview,
  normalizeOrder,
  sameArray,
} from "./utils/ordering";
import { loadJson, saveJson, scopedKey } from "../../utils/storage";
import { useStatus } from "../../components/statusBar/useStatus";

export default function DocumentsPage() {
  const { user } = useAuth();
  const status = useStatus();

  const orderKey = scopedKey("documentsOrder", user?.email);
  const favoritesKey = scopedKey("documentsFavorites", user?.email);

  const navigate = useNavigate();
  const confirm = useConfirm();
  const location = useLocation();

  const isAdmin = user?.role === "admin";

  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});

  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);

  const [showForbidden, setShowForbidden] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setError(null);

    try {
      const data = await listDocuments();
      setDocs(data);

      setOrder((prev) => {
        const next = normalizeOrder(prev, data);
        if (!sameArray(next, prev)) saveJson(orderKey, next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }, [orderKey]);

  useEffect(() => {
    setOrder(loadJson<number[]>(orderKey, []));
    setFavorites(loadJson<Record<number, boolean>>(favoritesKey, {}));
  }, [orderKey, favoritesKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if ((location.state as { forbidden?: boolean } | null)?.forbidden) {
      setShowForbidden(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  function openDoc(doc: DocumentItem) {
    navigate(`/documents/${doc.id}`);
  }

  function openCreate() {
    navigate("/documents/new");
  }

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      saveJson(favoritesKey, next);
      return next;
    });
  }

  function toggleCardMenu(id: number) {
    setOpenMenuId((prev) => (prev === id ? null : id));
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
      status.show({ kind: "success", message: "Document deleted." });

      setDocs((prev) => prev.filter((d) => d.id !== doc.id));

      setOrder((prev) => {
        const next = prev.filter((id) => id !== doc.id);
        saveJson(orderKey, next);
        return next;
      });

      setFavorites((prev) => {
        const next = { ...prev };
        delete next[doc.id];
        saveJson(favoritesKey, next);
        return next;
      });
    } catch (e) {
      status.show({
        kind: "error",
        title: "Delete failed",
        message: e instanceof Error ? e.message : "Unknown error",
        timeoutMs: 0,
      });
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setOpenMenuId(null);
    }
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
      saveJson(orderKey, next);
      return next;
    });
  }

  async function onExport() {
    try {
      await downloadExport();
      status.show({ kind: "success", message: "Export started." });
    } catch (e) {
      status.show({
        kind: "error",
        title: "Export failed",
        message: e instanceof Error ? e.message : "Unknown error",
        timeoutMs: 0,
      });
    }
  }

  async function requestImport(mode: "merge" | "replace") {
    if (!isAdmin) {
      status.show({
        kind: "error",
        title: "Forbidden",
        message: "This action is available to admins only.",
      });
      return;
    }

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
      setError(null);

      try {
        const file = input.files?.[0];
        if (!file) return;

        const text = await file.text();
        const parsed = JSON.parse(text);
        const documents = normalizeImportedDocuments(parsed);

        if (documents.length === 0) {
          setError(
            'Import file must be a JSON array of documents (or { "documents": [...] }).'
          );
          return;
        }

        await importDocumentsBulk({ mode, documents });
        await load();
        status.show({ kind: "success", message: "Import completed." });
        setPageMenuOpen(false);
      } catch (e) {
        status.show({
          kind: "error",
          title: "Import failed",
          message: e instanceof Error ? e.message : "Unknown error",
          timeoutMs: 0,
        });
        setError(e instanceof Error ? e.message : "Import failed");
      } finally {
        input.value = "";
      }
    };

    input.click();
  }

  return (
    <div className="documents-page" role="presentation">
      {showForbidden && (
        <InlineBanner type="error">
          <div className="banner">
            <span>This section is available to admins only.</span>
            <button onClick={() => setShowForbidden(false)} type="button">
              ✕
            </button>
          </div>
        </InlineBanner>
      )}

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
        isAdmin={isAdmin}
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
                  isAdmin={isAdmin}
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
