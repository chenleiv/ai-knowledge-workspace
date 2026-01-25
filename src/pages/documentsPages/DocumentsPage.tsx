import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./documentsPage.scss";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  deleteDocument,
  importDocumentsBulk,
  listDocuments,
  type DocumentItem,
} from "../../api/documentsClient";
import useConfirm from "../../hooks/useConfirm";
import DocumentsHeader from "./components/DocumentsHeader";
import InlineBanner from "../../components/banners/InlineBanner";
import { useAuth } from "../../auth/useAuth";
import { downloadExport } from "../../api/downloadExport";
import { normalizeImportedDocuments } from "./utils/documentsPageHelpers";
import { applyOrder, normalizeOrder, sameArray } from "./utils/ordering";
import { loadJson, saveJson, scopedKey } from "../../utils/storage";
import { useStatus } from "../../components/statusBar/useStatus";
import DocumentPane from "./components/DocumentPane";
import DocumentRow from "./components/documentRow";

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

  // list order (kept, even if you currently don't drag)
  const [order, setOrder] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showForbidden, setShowForbidden] = useState(false);

  // Right pane selection
  const [activeDocId, setActiveDocId] = useState<number | null>(null);



  const activeDoc = useMemo(() => {
    if (activeDocId == null) return null;
    return docs.find((d) => d.id === activeDocId) ?? null;
  }, [activeDocId, docs]);

  const load = useCallback(async () => {
    setError(null);

    try {
      const data = await listDocuments();
      setDocs(data);

      // keep order aligned with actual docs
      setOrder((prev) => {
        const next = normalizeOrder(prev, data);
        if (!sameArray(next, prev)) saveJson(orderKey, next);
        return next;
      });

      // if active doc disappears (deleted remotely etc.)
      setActiveDocId((prev) => {
        if (prev == null) return prev;
        return data.some((d) => d.id === prev) ? prev : null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }, [orderKey]);

  // load local order + favorites
  useEffect(() => {
    setOrder(loadJson<number[]>(orderKey, []));
    setFavorites(loadJson<Record<number, boolean>>(favoritesKey, {}));
  }, [orderKey, favoritesKey]);

  // load docs
  useEffect(() => {
    void load();
  }, [load]);

  // forbidden banner from route state
  useEffect(() => {
    if ((location.state as { forbidden?: boolean } | null)?.forbidden) {
      setShowForbidden(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

      setActiveDocId((prev) => (prev === doc.id ? null : prev));
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

  const regularDocs = filteredDocs;

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

      <h2 className="title">Documents</h2>

      <div className="search-row" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          placeholder="Search title, category, summary, content..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="documents-split">
        <div className="documents-left">
          <DocumentsHeader
            onNew={openCreate}
            onExport={() => void onExport()}
            onImport={(mode) => void requestImport(mode)}
            isAdmin={isAdmin}
          />

          <div className="section">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={regularDocs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div className="docs-list">
                  {regularDocs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      active={activeDocId === doc.id}
                      isFavorite={!!favorites[doc.id]}
                      isAdmin={isAdmin}
                      isMenuOpen={openMenuId === doc.id}
                      onOpen={() => setActiveDocId(doc.id)}
                      onToggleFavorite={toggleFavorite}
                      onToggleMenu={toggleCardMenu}
                      onCloseMenu={() => setOpenMenuId(null)}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {filteredDocs.length === 0 && (
            <p className="empty">No documents found.</p>
          )}
        </div>

        <div className="documents-right">
          <DocumentPane
            doc={activeDoc}
            canEdit={isAdmin}
            onOpenFullPage={(id) => navigate(`/documents/${id}`)}
            onSaved={(updated) => {
              setDocs((prev) =>
                prev.map((d) => (d.id === updated.id ? updated : d))
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}