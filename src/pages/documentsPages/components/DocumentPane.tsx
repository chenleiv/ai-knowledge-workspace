import { useEffect, useMemo, useState } from "react";
import type { DocumentItem, DocumentInput } from "../../../api/documentsClient";
import { updateDocument } from "../../../api/documentsClient";
import { useStatus } from "../../../components/statusBar/useStatus";

type Props = {
    doc: DocumentItem | null;
    canEdit: boolean;
    onOpenFullPage: (id: number) => void;
    onSaved: (doc: DocumentItem) => void;
};

function toInput(d: DocumentItem): DocumentInput {
    return {
        title: d.title,
        category: d.category,
        summary: d.summary,
        content: d.content,
    };
}

export default function DocumentPane({ doc, canEdit, onOpenFullPage, onSaved }: Props) {
    const status = useStatus();
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [form, setForm] = useState<DocumentInput>({
        title: "",
        category: "",
        summary: "",
        content: "",
    });
    const [baseline, setBaseline] = useState<DocumentInput>(form);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!doc) {
            setMode("view");
            return;
        }
        const next = toInput(doc);
        setForm(next);
        setBaseline(next);
        setMode("view");
    }, [doc?.id]); // switch doc resets pane

    const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

    async function onSave() {
        if (!doc) return;
        if (!canEdit) {
            status.show({ kind: "error", title: "Forbidden", message: "Admins only." });
            return;
        }

        const title = form.title.trim();
        const category = form.category.trim();
        const summary = form.summary.trim();
        const content = form.content.trim();

        if (!title || !category || !summary || !content) {
            status.show({ kind: "error", title: "Missing fields", message: "Please fill all fields." });
            return;
        }

        setSaving(true);
        try {
            const updated = await updateDocument(doc.id, { title, category, summary, content });
            onSaved(updated);
            setBaseline(toInput(updated));
            setForm(toInput(updated));
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

    function onCancel() {
        setForm(baseline);
        setMode("view");
    }

    if (!doc) {
        return (
            <div className="doc-pane">
                <div className="doc-pane-empty">
                    <div className="doc-pane-empty-title">Select a document</div>
                    <div className="doc-pane-empty-sub">
                        Select a document on the left to preview and edit it here
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="doc-pane">
            <div className="doc-pane-top">
                <h2 className="doc-pane-title">{doc.title}</h2>

                <div className="doc-pane-actions">
                    {mode === "view" ? (
                        <>
                            {canEdit && (
                                <button
                                    type="button"
                                    className="icon-btn doc-pane-edit"
                                    onClick={() => setMode("edit")}
                                    title="Edit"
                                    aria-label="Edit"
                                >
                                    ✎
                                </button>
                            )}

                            <button
                                type="button"
                                className="doc-pane-link"
                                onClick={() => onOpenFullPage(doc.id)}
                            >
                                Open
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="doc-pane-save"
                                onClick={onSave}
                                disabled={saving || !isDirty}
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                className="doc-pane-cancel"
                                onClick={onCancel}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {mode === "view" ? (
                <div className="doc-pane-body">
                    {/* <h2 className="doc-pane-title">{doc.title}</h2> */}
                    <div className="doc-pane-meta">{doc.category}</div>

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
                    <div className="doc-pane-form">
                        <label>
                            Title
                            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
                                rows={16}
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                            />
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}