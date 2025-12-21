import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

export default function DocumentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const isNew = id === "new";
  const docId = useMemo(() => Number(id), [id]);

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"view" | "edit">(isNew ? "edit" : "view");
  const [form, setForm] = useState<DocumentInput>(emptyInput());
  const [isSaving, setIsSaving] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  async function load() {
    if (isNew) {
      setDoc(null);
      setForm(emptyInput());
      setError(null);
      setLoading(false);
      return;
    }

    if (!Number.isFinite(docId)) {
      setError("Invalid document id.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getDocument(docId);
      setDoc(data);
      setForm(toInput(data));
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave() {
    const title = form.title.trim();
    const category = form.category.trim();
    const summary = form.summary.trim();
    const content = form.content.trim();

    if (!title || !category || !summary || !content) {
      setError("Please fill all fields.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isNew) {
        const created = await createDocument({
          title,
          category,
          summary,
          content,
        });
        navigate(`/documents/${created.id}`, { replace: true });
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
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  function onCancelEdit() {
    if (isNew) {
      navigate("/documents");
      return;
    }
    if (doc) setForm(toInput(doc));
    setMode("view");
    setError(null);
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

    setError(null);
    try {
      await deleteDocument(doc.id);
      navigate("/documents");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setMenuOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="doc-details">
        <div className="doc-details-top">
          <Link to="/documents" className="back-link">
            ← Back
          </Link>
        </div>
        <div className="panel">Loading…</div>
      </div>
    );
  }

  if (error && !isNew && !doc) {
    return (
      <div className="doc-details">
        <div className="doc-details-top">
          <Link to="/documents" className="back-link">
            ← Back
          </Link>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="doc-details" role="presentation">
      <div className="doc-details-top">
        <Link to="/documents" className="back-link">
          ← Back
        </Link>

        <div className="top-actions">
          {mode === "view" ? (
            <button
              className="primary-btn"
              type="button"
              onClick={() => setMode("edit")}
            >
              Edit
            </button>
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

          {!isNew && (
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

      {error && <div className="error">{error}</div>}

      <div className="panel">
        {mode === "view" && doc ? (
          <>
            <h2 className="title">{doc.title}</h2>
            <div className="meta">{doc.category}</div>

            <div className="section">
              <div className="label">Summary</div>
              <div className="text">{doc.summary}</div>
            </div>

            <div className="section">
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
              />
            </label>

            <label>
              Category
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>

            <label>
              Summary
              <textarea
                rows={4}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </label>

            <label>
              Content
              <textarea
                rows={18}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
