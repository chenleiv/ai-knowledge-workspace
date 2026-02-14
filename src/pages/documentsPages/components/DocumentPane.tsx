import { useActionState, useState } from "react";
import type { DocumentItem, DocumentInput } from "../../../api/documentsClient";
import { createDocument, updateDocument } from "../../../api/documentsClient";
import { useStatus } from "../../../components/statusBar/useStatus";
import { SquarePenIcon, X } from "lucide-react";

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
        title: (i.title || "").trim(),
        category: (i.category || "").trim(),
        summary: (i.summary || "").trim(),
        content: (i.content || "").trim(),
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

    const [mode, setMode] = useState<"view" | "edit">(isCreating ? "edit" : "view");

    const [form, setForm] = useState<DocumentInput>(() => {
        if (isCreating) return emptyInput();
        if (doc) return toInput(doc);
        return emptyInput();
    });

    const baseline = (() => {
        if (isCreating) return emptyInput();
        if (doc) return toInput(doc);
        return emptyInput();
    })();

    const isDirty = !isSameInput(normalizeInput(form), normalizeInput(baseline));

    const [error, saveAction, isPending] = useActionState(
        async (_prev: string | null, formData: FormData) => {
            if (!canEdit) {
                const msg = "Admins only.";
                status.show({ kind: "error", title: "Forbidden", message: msg });
                return msg;
            }

            const cleaned: DocumentInput = {
                title: (formData.get("title") as string).trim(),
                category: (formData.get("category") as string).trim(),
                summary: (formData.get("summary") as string).trim(),
                content: (formData.get("content") as string).trim(),
            };

            if (!cleaned.title || !cleaned.category || !cleaned.summary || !cleaned.content) {
                const msg = "Please fill all fields.";
                status.show({ kind: "error", title: "Missing fields", message: msg });
                return msg;
            }

            try {
                if (isCreating) {
                    const created = await createDocument(cleaned);
                    onCreated(created);
                    status.show({ kind: "success", message: "Document created." });
                    return null;
                }

                if (!doc) return "No document selected";

                const updated = await updateDocument(doc.id, cleaned);
                onSaved(updated);
                setForm(toInput(updated));
                setMode("view");
                status.show({ kind: "success", message: "Saved." });
                return null;
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Save failed.";
                status.show({ kind: "error", title: "Save failed", message: msg, timeoutMs: 0 });
                return msg;
            }
        },
        null
    );

    const canSave = canEdit && !isPending && isDirty;

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
        <form className="doc-pane" action={saveAction}>
            {onBack && (
                <div className="mobile-back-wrapper">
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                            onBack();
                            onDismissHint?.();
                        }}
                        aria-label="Back"
                    >
                        <X />
                    </button>
                    {showMobileHint && (
                        <div className="mobile-hint-bubble" onClick={onDismissHint}>
                            Tap to return
                            <div className="arrow-up-left"></div>
                        </div>
                    )}
                </div>
            )}
            <div className="doc-pane-top">
                <div className="doc-pane-title-container">
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
                                type="submit"
                                className="primary-btn"
                                disabled={!canSave}
                            >
                                {isPending ? "Saving..." : "Save"}
                            </button>

                            <button
                                type="button"
                                className="primary-btn"
                                onClick={handleCancel}
                                disabled={isPending}
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
                    {error && <div className="error-banner">{error}</div>}
                    <label className="doc-pane-label">
                        Title
                        <input
                            name="title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                    </label>

                    <label className="doc-pane-label">
                        Category
                        <input
                            name="category"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        />
                    </label>

                    <label className="doc-pane-label">
                        Summary
                        <textarea
                            name="summary"
                            rows={4}
                            value={form.summary}
                            onChange={(e) => setForm({ ...form, summary: e.target.value })}
                        />
                    </label>

                    <label className="doc-pane-label">
                        Content
                        <textarea
                            name="content"
                            rows={16}
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                        />
                    </label>
                </div>
            )}
        </form>
    );
}