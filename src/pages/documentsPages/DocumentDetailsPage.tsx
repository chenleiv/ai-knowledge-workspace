import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./documentDetailsPage.scss";

import {
  createDocument,
  deleteDocument,
  getDocument,
  updateDocument,
  type DocumentInput,
  type DocumentItem,
} from "../../api/documentsClient";

import useConfirm from "../../hooks/useConfirm";
import Menu from "../../components/menu/Menu";
import { useAuth } from "../../auth/useAuth";
import { useStatus } from "../../components/statusBar/useStatus";
import { useUnsavedChangesWarning } from "../../hooks/useUnsavedChanges";

function toInput(doc: DocumentItem): DocumentInput {
  return {
    title: doc.title,
    category: doc.category,
    summary: doc.summary,
    content: doc.content,
  };
}

function emptyInput(): DocumentInput {
  return { title: "", category: "", summary: "", content: "" };
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const status = useStatus();

  const isAdmin = user?.role === "admin";
  const isNew = !id || id === "new";

  const docId = useMemo(() => {
    if (!id || id === "new") return null;
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(isNew ? "edit" : "view");
  const [form, setForm] = useState<DocumentInput>(emptyInput());
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [baseline, setBaseline] = useState<DocumentInput>(emptyInput());

  const isDirty = useMemo(() => {
    const a = JSON.stringify(form);
    const b = JSON.stringify(baseline);
    return a !== b;
  }, [form, baseline]);

  useUnsavedChangesWarning({
    enabled: mode === "edit" && isDirty,
    message: "You have unsaved changes. Are you sure you want to leave?",
  });

  const canEdit = isAdmin;
  const canDelete = isAdmin && !isNew;

  const load = useCallback(async () => {
    if (isNew) {
      const empty = emptyInput();
      setDoc(null);
      setForm(empty);
      setBaseline(empty);
      setMode("edit");
      return;
    }

    if (docId == null) {
      setDoc(null);
      setMode("view");
      status.show({
        kind: "error",
        title: "Invalid URL",
        message: "Document id is invalid.",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await getDocument(docId);
      setDoc(data);
      const next = toInput(data);
      setForm(next);
      setBaseline(next);
      setMode("view");
    } catch (e) {
      setDoc(null);
      status.show({
        kind: "error",
        title: "Failed to load",
        message: errorMessage(e, "Failed to load document."),
        timeoutMs: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [docId, isNew, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!isAdmin) {
      status.show({
        kind: "error",
        title: "Forbidden",
        message: "This action is available to admins only.",
      });
      return;
    }

    const title = form.title.trim();
    const category = form.category.trim();
    const summary = form.summary.trim();
    const content = form.content.trim();

    if (!title || !category || !summary || !content) {
      status.show({
        kind: "error",
        title: "Missing fields",
        message: "Please fill all fields.",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        setBaseline({ title, category, summary, content });
        const created = await createDocument({
          title,
          category,
          summary,
          content,
        });
        status.show({ kind: "success", message: "Document created." });
        navigate(`/documents/${created.id}`, { replace: true });
        return;
      }

      if (docId == null) {
        status.show({
          kind: "error",
          title: "Invalid URL",
          message: "Document id is invalid.",
        });
        return;
      }

      const updated = await updateDocument(docId, {
        title,
        category,
        summary,
        content,
      });
      setDoc(updated);
      setForm(toInput(updated));
      setBaseline(toInput(updated));
      setMode("view");
      status.show({ kind: "success", message: "Changes saved." });
    } catch (e) {
      status.show({
        kind: "error",
        title: "Save failed",
        message: errorMessage(e, "Save failed."),
        timeoutMs: 0,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function onCancelEdit() {
    if (isNew) {
      navigate("/documents");
      return;
    }
    if (doc) {
      const next = toInput(doc);
      setForm(next);
      setBaseline(next);
    }
    setMode("view");
  }

  async function onDelete() {
    if (!doc) return;

    const ok = await confirm({
      title: "Delete document",
      message: `Are you sure you want to delete "${doc.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (!ok) return;

    try {
      await deleteDocument(doc.id);
      status.show({ kind: "success", message: "Document deleted." });
      navigate("/documents", { replace: true });
    } catch (e) {
      status.show({
        kind: "error",
        title: "Delete failed",
        message: errorMessage(e, "Delete failed."),
        timeoutMs: 0,
      });
    } finally {
      setMenuOpen(false);
    }
  }

  async function onBack() {
    if (mode === "edit" && isDirty) {
      const ok = await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes. Leave without saving?",
        confirmLabel: "Leave",
        cancelLabel: "Stay",
        variant: "danger",
      });
      if (!ok) return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/documents", { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="doc-details">
        <div className="doc-details-top">
          <button type="button" className="back-link" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div className="panel">Loading…</div>
      </div>
    );
  }

  if (!isNew && !doc) {
    return (
      <div className="doc-details">
        <div className="doc-details-top">
          <button type="button" className="back-link" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div className="panel">Document not found.</div>
      </div>
    );
  }

  return (
    <div className="doc-details" role="presentation">
      <div className="doc-details-top">
        <button type="button" className="back-link" onClick={onBack}>
          ← Back
        </button>

        <div className="top-actions">
          {mode === "view" ? (
            canEdit ? (
              <button
                className="primary-btn"
                type="button"
                onClick={() => setMode("edit")}
              >
                Edit
              </button>
            ) : null
          ) : (
            <>
              <button
                className="primary-btn"
                type="button"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </button>
            </>
          )}

          {canDelete && (
            <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                className="icon-btn"
                type="button"
                aria-label="Menu"
                title="Menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                ⋯
              </button>

              <Menu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                items={[{ label: "Delete", danger: true, onClick: onDelete }]}
              />
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        {mode === "view" && doc ? (
          <>
            <h2 className="title">{doc.title}</h2>
            <div className="meta">{doc.category}</div>

            <div className="section summary">
              <div className="label">Summary</div>
              <div className="text">{doc.summary}</div>
            </div>

            <div className="section content">
              <div className="label">Content</div>
              <div className="text content">{doc.content}</div>
            </div>
          </>
        ) : (
          <div className="form">
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!canEdit}
              />
            </label>

            <label>
              Category
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={!canEdit}
              />
            </label>

            <label>
              Summary
              <textarea
                rows={4}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                disabled={!canEdit}
              />
            </label>

            <label>
              Content
              <textarea
                rows={18}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                disabled={!canEdit}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
