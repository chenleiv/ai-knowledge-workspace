import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DocumentsList from "./components/DocumentList";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import "./documentsPage.scss";
import {
  deleteDocument,
  importDocumentsBulk,
  listDocuments,
  type DocumentItem,
} from "../../api/documentsClient";
import useConfirm from "../../hooks/useConfirm";

import { useAuth } from "../../auth/useAuth";
import { downloadExport } from "../../api/downloadExport";
import { normalizeImportedDocuments } from "./utils/documentsPageHelpers";
import { applyOrder, normalizeOrder, sameArray } from "./utils/ordering";
import { saveJson, scopedKey } from "../../utils/storage";
import { useStatus } from "../../components/statusBar/useStatus";
import DocumentPane from "./components/DocumentPane";
import DocumentsSidebar from "./components/DocumentsSidebar";

export default function DocumentsPage() {
  const { user } = useAuth();
  const status = useStatus();

  const orderKey = scopedKey("documentsOrder", user?.email);

  const navigate = useNavigate();
  const confirm = useConfirm();
  const location = useLocation();

  const isAdmin = user?.role === "admin";

  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  // const [paneMode, setPaneMode] = useState<DrawerMode>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showForbidden, setShowForbidden] = useState(false);
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

      setOrder((prev) => {
        const next = normalizeOrder(prev, data);
        if (!sameArray(next, prev)) saveJson(orderKey, next);
        return next;
      });

      setActiveDocId((prev) => {
        if (prev == null) {
          return data.length > 0 ? data[0].id : null;
        }
        return data.some((d) => d.id === prev) ? prev : (data[0]?.id ?? null);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }, [orderKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if ((location.state as { forbidden?: boolean } | null)?.forbidden) {
      setShowForbidden(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  function handleCreated(doc: DocumentItem) {
    setIsCreating(false);
    setDocs((prev) => [doc, ...prev]);
    setOrder((prev) => {
      const without = prev.filter((x) => x !== doc.id);
      const next = [doc.id, ...without];
      saveJson(orderKey, next);
      return next;
    });
    setActiveDocId(doc.id);
  }

  function openCreate() {
    setIsCreating(true);
    setActiveDocId(null);
  }

  function openDocument(id: number) {
    setIsCreating(false);
    setActiveDocId(id);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as number);
      const newIndex = prev.indexOf(over.id as number);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const next = arrayMove(prev, oldIndex, newIndex);
      saveJson(orderKey, next);
      return next;
    });
  }

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
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
    <div className="documents-layout" role="presentation">
      <div className="documents-sidebar">
        <DocumentsSidebar
          isAdmin={isAdmin}
          query={query}
          onQueryChange={setQuery}
          error={error}
          showForbidden={showForbidden}
          onCloseForbidden={() => setShowForbidden(false)}
          onNew={openCreate}
          onExport={() => void onExport()}
          onImport={(mode) => void requestImport(mode)}
        >
          <DocumentsList
            docs={regularDocs}
            activeDocId={activeDocId}
            favorites={favorites}
            isAdmin={isAdmin}
            openMenuId={openMenuId}
            onToggleMenu={toggleCardMenu}
            onCloseMenu={() => setOpenMenuId(null)}
            onOpen={(id) => openDocument(id)}
            onToggleFavorite={toggleFavorite}
            onDelete={onDelete}
            onDragEnd={onDragEnd}
          />
        </DocumentsSidebar>
      </div>

      <section className="documents-pane">
        <DocumentPane
          doc={activeDoc}
          canEdit={isAdmin}
          isCreating={isCreating}
          onCancelCreate={() => setIsCreating(false)}
          onCreated={handleCreated}
          onSaved={(updated) => {
            setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          }}
        />
      </section>
    </div>
  );
}