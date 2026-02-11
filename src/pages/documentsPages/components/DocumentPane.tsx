import { useEffect, useMemo, useState } from "react";
import type { DocumentItem, DocumentInput } from "../../../api/documentsClient";
import { createDocument, updateDocument } from "../../../api/documentsClient";
import { useStatus } from "../../../components/statusBar/useStatus";
import { EditIcon } from "lucide-react";

type Props = {
    doc: DocumentItem | null;
    canEdit: boolean;
    isCreating: boolean;
    onCancelCreate: () => void;
    onCreated: (doc: DocumentItem) => void;
    onSaved: (doc: DocumentItem) => void;
    hasDocs: boolean;
};

function toInput(d: DocumentItem): DocumentInput {
    return {
        title: d.title,
        category: d.category,
        summary: d.summary,
        content: d.content,
    };
}

function emptyInput(): DocumentInput {
    return { title: "", category: "", summary: "", content: "" };
}

export default function DocumentPane({
    doc,
    canEdit,
    isCreating,
    onCancelCreate,
    onCreated,
    onSaved,
    hasDocs,
}: Props) {
    const status = useStatus();

    const [mode, setMode] = useState<"view" | "edit">("view");
    const [form, setForm] = useState<DocumentInput>(emptyInput());
    const [baseline, setBaseline] = useState<DocumentInput>(emptyInput());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isCreating) {
            const empty = emptyInput();
            setForm(empty);
            setBaseline(empty);
            setMode("edit");
            return;
        }

        if (!doc) {
            setMode("view");
            return;
        }

        const next = toInput(doc);
        setForm(next);
        setBaseline(next);
        setMode("view");
    }, [isCreating, doc]);

    const isDirty = useMemo(
        () => JSON.stringify(form) !== JSON.stringify(baseline),
        [form, baseline]
    );

    async function handleSave() {
        if (!canEdit) {
            status.show({
                kind: "error",
                title: "Forbidden",
                message: "Admins only.",
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

        setSaving(true);
        try {
            if (isCreating) {
                const created = await createDocument({ title, category, summary, content });
                onCreated(created);
                status.show({ kind: "success", message: "Document created." });
                return;
            }

            if (!doc) return;

            const updated = await updateDocument(doc.id, {
                title,
                category,
                summary,
                content,
            });

            onSaved(updated);

            const next = toInput(updated);
            setForm(next);
            setBaseline(next);
            setMode("view");

            status.show({ kind: "success", message: "Saved." });
        } catch (e) {
            status.show({
                kind: "error",
                title: "Save failed",
                message: e instanceof Error ? e.message : "Save failed.",
                timeoutMs: 0,
            });
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        if (isCreating) {
            onCancelCreate();
            return;
        }

        setForm(baseline);
        setMode("view");
    }

    if (!isCreating && !doc) {
        return (
            <div className="doc-pane">
                <div className="doc-pane-empty">
                    {hasDocs ? (
                        <>
                            <div className="doc-pane-empty-title">Select a document</div>
                            <div className="doc-pane-empty-sub">
                                Choose a document on the left to preview it here.
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="doc-pane-empty-title">No documents yet</div>
                            <div className="doc-pane-empty-sub">
                                Create your first document to get started.
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const paneTitle = isCreating ? "New document" : (doc?.title ?? "");
    const paneCategory = isCreating ? "" : (doc?.category ?? "");

    return (
        <div className="doc-pane">
            <div className="doc-pane-top">
                <div className="doc-pane-title-container">
                    <h2 className="doc-pane-title">{paneTitle}</h2>
                    {paneCategory ? (
                        <h4 className="doc-pane-title small">{paneCategory}</h4>
                    ) : null}
                </div>

                <div className="doc-pane-actions">
                    {mode === "view" ? (
                        <>
                            {canEdit && !isCreating ? (
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => setMode("edit")}
                                    title="Edit"
                                    aria-label="Edit"
                                >
                                    <EditIcon />
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="primary-btn"
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>

                            <button
                                type="button"
                                className="primary-btn"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {mode === "view" && doc ? (
                <div key={doc.id} className="doc-pane-body doc-pane-anim">
                    <div className="doc-pane-section">
                        <div className="doc-pane-label">Summary</div>
                        <div className="doc-pane-text">{doc.summary}</div>
                    </div>

                    <div className="doc-pane-section">
                        <div className="doc-pane-label">Content</div>
                        <div className="doc-pane-text prewrap">{doc.content}</div>
                    </div>
                </div>
            ) : (
                <div className="doc-pane-body">
                    <label className="doc-pane-label">
                        Title
                        <input
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                    </label>

                    <label className="doc-pane-label">
                        Category
                        <input
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        />
                    </label>

                    <label className="doc-pane-label">
                        Summary
                        <textarea
                            rows={4}
                            value={form.summary}
                            onChange={(e) => setForm({ ...form, summary: e.target.value })}
                        />
                    </label>

                    <label className="doc-pane-label">
                        Content
                        <textarea
                            rows={16}
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                        />
                    </label>
                </div>
            )}
        </div>
    );
}