import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
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
import DocumentCard from "./components/documentCard";
import InlineBanner from "../../components/banners/InlineBanner";
import { useAuth } from "../../auth/useAuth";
import { downloadExport } from "../../api/downloadExport";
import { normalizeImportedDocuments } from "./utils/documentsPageHelpers";
import { applyOrder, normalizeOrder, sameArray } from "./utils/ordering";
import { loadJson, saveJson, scopedKey } from "../../utils/storage";
import { useStatus } from "../../components/statusBar/useStatus";

import FavoriteChip from "./components/favoriteChip";
import {
  getFavoritesOrder,
  saveFavoritesOrder,
} from "../../api/favoritesOrderClient";

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

  // Keep your existing order for regular docs (even if we later remove dragging)
  const [order, setOrder] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [showForbidden, setShowForbidden] = useState(false);

  // Favorites order persisted in backend
  const [favOrder, setFavOrder] = useState<number[]>([]);
  const [favEditMode, setFavEditMode] = useState(false);
  const [favDraftOrder, setFavDraftOrder] = useState<number[]>([]);
  const [isSavingFavOrder, setIsSavingFavOrder] = useState(false);

  // DnD sensors for favorites chips (horizontal)
  const favSensors = useSensors(
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

  // Load local order + local favorites
  useEffect(() => {
    setOrder(loadJson<number[]>(orderKey, []));
    setFavorites(loadJson<Record<number, boolean>>(favoritesKey, {}));
  }, [orderKey, favoritesKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load favorites order from backend (per user)
  useEffect(() => {
    let cancelled = false;

    async function loadFavOrder() {
      try {
        const res = await getFavoritesOrder();
        if (cancelled) return;
        setFavOrder(res.order ?? []);
      } catch {
        // ok to ignore (works even if not configured yet)
        setFavOrder([]);
      }
    }

    void loadFavOrder();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if ((location.state as { forbidden?: boolean } | null)?.forbidden) {
      setShowForbidden(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  function openDocById(id: number) {
    navigate(`/documents/${id}`);
  }

  function openDoc(doc: DocumentItem) {
    openDocById(doc.id);
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
        const next = prev.filter((x) => x !== doc.id);
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
    if (!q) return orderedDocs;

    return orderedDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [query, orderedDocs]);

  const favoriteIdsSet = useMemo(() => {
    return new Set(Object.keys(favorites).map((k) => Number(k)));
  }, [favorites]);

  // Favorites chips should follow backend order; anything missing goes to the end.
  const favoriteDocs = useMemo(() => {
    const favDocs = filteredDocs.filter((d) => favoriteIdsSet.has(d.id));
    if (favDocs.length === 0) return [];

    const byId = new Map(favDocs.map((d) => [d.id, d]));
    const ordered: DocumentItem[] = [];

    for (const id of favOrder) {
      const doc = byId.get(id);
      if (doc) ordered.push(doc);
    }
    for (const doc of favDocs) {
      if (!favOrder.includes(doc.id)) ordered.push(doc);
    }

    return ordered;
  }, [filteredDocs, favoriteIdsSet, favOrder]);

  // Regular docs remain where they are (favorites are NOT removed from list)
  // If you want to hide favorites from "All documents", say and we’ll do it.
  const regularDocs = filteredDocs;

  function startFavoritesEdit() {
    setFavDraftOrder(favoriteDocs.map((d) => d.id));
    setFavEditMode(true);
  }

  function cancelFavoritesEdit() {
    setFavEditMode(false);
    setFavDraftOrder([]);
  }

  async function saveFavoritesEdit() {
    setIsSavingFavOrder(true);
    try {
      await saveFavoritesOrder(favDraftOrder);
      setFavOrder(favDraftOrder);
      setFavEditMode(false);
      status.show({ kind: "success", message: "Favorites order saved." });
    } catch (e) {
      status.show({
        kind: "error",
        title: "Save failed",
        message:
          e instanceof Error ? e.message : "Could not save favorites order.",
        timeoutMs: 0,
      });
    } finally {
      setIsSavingFavOrder(false);
    }
  }

  function onFavDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    setFavDraftOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as number);
      const newIndex = prev.indexOf(over.id as number);
      return arrayMove(prev, oldIndex, newIndex);
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
      </div>

      {/* Favorites chips */}
      {favoriteDocs.length > 0 && (
        <div className="favorites-chips" onClick={(e) => e.stopPropagation()}>
          <div className="favorites-chips-head">
            <div className="favorites-chips-label">Favorites</div>

            {!favEditMode ? (
              <button
                type="button"
                className="favorites-edit-btn"
                onClick={startFavoritesEdit}
              >
                Edit
              </button>
            ) : (
              <div className="favorites-edit-actions">
                <button
                  type="button"
                  className="favorites-cancel-btn"
                  onClick={cancelFavoritesEdit}
                  disabled={isSavingFavOrder}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="favorites-save-btn"
                  onClick={saveFavoritesEdit}
                  disabled={isSavingFavOrder}
                >
                  {isSavingFavOrder ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {favEditMode ? (
            <DndContext
              sensors={favSensors}
              collisionDetection={closestCenter}
              onDragEnd={onFavDragEnd}
            >
              <SortableContext
                items={favDraftOrder}
                strategy={horizontalListSortingStrategy}
              >
                <div className="favorites-chips-row">
                  {favDraftOrder.map((id) => {
                    const doc = favoriteDocs.find((d) => d.id === id);
                    if (!doc) return null;
                    return (
                      <FavoriteChip
                        key={doc.id}
                        doc={doc}
                        editable={true}
                        onOpen={openDocById}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="favorites-chips-row">
              {favoriteDocs.map((d) => (
                <FavoriteChip
                  key={d.id}
                  doc={d}
                  editable={false}
                  onOpen={openDocById}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="section">
        <div className="section-title">All documents</div>

        {/* ✅ No DnD here anymore (regular cards not draggable) */}
        <div className="docs-grid">
          {regularDocs.map((doc) => (
            <DocumentCard
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
      </div>

      {filteredDocs.length === 0 && (
        <p className="empty">No documents found.</p>
      )}
    </div>
  );
}
