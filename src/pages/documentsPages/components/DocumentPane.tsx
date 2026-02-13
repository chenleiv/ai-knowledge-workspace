import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentItem, DocumentInput } from "../../../api/documentsClient";
import { createDocument, updateDocument } from "../../../api/documentsClient";
import { useStatus } from "../../../components/statusBar/useStatus";
import { ChevronLeft, SquarePenIcon } from "lucide-react";

type Props = {
    doc: DocumentItem | null;
    canEdit: boolean;
    isCreating: boolean;
    onCancelCreate: () => void;
    onCreated: (doc: DocumentItem) => void;
    onSaved: (doc: DocumentItem) => void;
    hasDocs: boolean;
    onBack?: () => void;
    showMobileHint?: boolean;
    onDismissHint?: () => void;
};

function toInput(d: DocumentItem): DocumentInput {
    return {
        title: d.title ?? "",
        category: d.category ?? "",
        summary: d.summary ?? "",
        content: d.content ?? "",
    };
}

function emptyInput(): DocumentInput {
    return { title: "", category: "", summary: "", content: "" };
}

function normalizeInput(i: DocumentInput): DocumentInput {
    return {
        title: i.title.trim(),
        category: i.category.trim(),
        summary: i.summary.trim(),
        content: i.content.trim(),
    };
}

function isSameInput(a: DocumentInput, b: DocumentInput): boolean {
    return (
        a.title === b.title &&
        a.category === b.category &&
        a.summary === b.summary &&
        a.content === b.content
    );
}

export default function DocumentPane({
    doc,
    canEdit,
    isCreating,
    onCancelCreate,
    onCreated,
    onSaved,
    hasDocs,
    onBack,
    showMobileHint,
    onDismissHint,
}: Props) {
    const status = useStatus();

    const [mode, setMode] = useState<"view" | "edit">("view");
    const [form, setForm] = useState<DocumentInput>(emptyInput());
    const [saving, setSaving] = useState(false);

    // Baseline kept in a ref so it doesn't trigger re-renders and stays stable.
    const baselineRef = useRef<DocumentInput>(emptyInput());

    // Track which doc the current form belongs to (prevents overwriting drafts).
    const activeDocIdRef = useRef<number | null>(null);

    useEffect(() => {
        // Creating mode: always reset to empty + edit
        if (isCreating) {
            const empty = emptyInput();
            baselineRef.current = empty;
            activeDocIdRef.current = null;
            setForm(empty);
            setMode("edit");
            return;
        }

        // No doc selected: view mode, keep form as-is (doesn't matter)
        if (!doc) {
            activeDocIdRef.current = null;
            setMode("view");
            return;
        }

        // If we are editing the same doc, don't override the user's draft.
        const incomingId = doc.id;
        const isSameDoc = activeDocIdRef.current === incomingId;

        if (mode === "edit" && isSameDoc) return;

        // Otherwise, sync form with the selected doc
        const next = toInput(doc);
        baselineRef.current = next;
        activeDocIdRef.current = incomingId;
        setForm(next);
        setMode("view");
    }, [isCreating, doc, mode]);

    const isDirty = useMemo(() => {
        // Compare normalized so trailing spaces don't cause "dirty" flicker.
        return !isSameInput(normalizeInput(form), normalizeInput(baselineRef.current));
    }, [form]);

    const canSave = canEdit && !saving && isDirty;

    async function handleSave() {
        if (!canEdit) {
            status.show({ kind: "error", title: "Forbidden", message: "Admins only." });
            return;
        }

        const cleaned = normalizeInput(form);

        if (!cleaned.title || !cleaned.category || !cleaned.summary || !cleaned.content) {
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
                const created = await createDocument(cleaned);
                onCreated(created);
                status.show({ kind: "success", message: "Document created." });

                // After creation, baseline becomes the saved version
                const next = toInput(created);
                baselineRef.current = next;
                activeDocIdRef.current = created.id;
                setForm(next);
                setMode("view");
                return;
            }

            if (!doc) return;

            const updated = await updateDocument(doc.id, cleaned);
            onSaved(updated);

            const next = toInput(updated);
            baselineRef.current = next;
            activeDocIdRef.current = updated.id;
            setForm(next);
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
        setForm(baselineRef.current);
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
                <div className="doc-pane-title-container" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {onBack && (
                        <div className="mobile-back-wrapper mobile-only-btn" style={{ position: "relative" }}>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => {
                                    onBack();
                                    onDismissHint?.();
                                }}
                                aria-label="Back"
                            >
                                <ChevronLeft />
                            </button>
                            {showMobileHint && (
                                <div className="mobile-hint-bubble" onClick={onDismissHint}>
                                    Tap to return
                                    <div className="arrow-up-left"></div>
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <h2 className="doc-pane-title">{paneTitle}</h2>
                        {paneCategory ? <h4 className="doc-pane-title small">{paneCategory}</h4> : null}
                    </div>
                </div>

                <div className="doc-pane-actions">
                    {mode === "view" ? (
                        <>
                            {canEdit && !isCreating ? (
                                <button
                                    type="button"
                                    className="icon-btn doc-pane-edit"
                                    onClick={() => setMode("edit")}
                                    title="Edit"
                                    aria-label="Edit"
                                >
                                    <SquarePenIcon />
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="primary-btn"
                                onClick={handleSave}
                                disabled={!canSave}
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