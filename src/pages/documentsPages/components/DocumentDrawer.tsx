import { useEffect } from "react";
import type { DocumentItem } from "../../../api/documentsClient";
import "./documentDrawer.scss";

type Props = {
  open: boolean;
  doc: DocumentItem | null;
  pinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onOpenFullPage: (id: number) => void;
};

export default function DocumentDrawer({
  open,
  doc,
  pinned,
  onClose,
  onTogglePin,
  onOpenFullPage,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div className={`doc-drawer-wrap ${open ? "is-open" : ""}`}>
      <div className="doc-drawer-backdrop" onClick={onClose} />

      <aside className="doc-drawer" role="dialog" aria-modal="true">
        <div className="doc-drawer-top">
          <button
            type="button"
            className="doc-drawer-icon"
            onClick={onTogglePin}
            aria-label={pinned ? "Unpin drawer" : "Pin drawer"}
            title={pinned ? "Unpin" : "Pin"}
          >
            {pinned ? "📌" : "📍"}
          </button>

          <div className="doc-drawer-spacer" />

          {doc ? (
            <button
              type="button"
              className="doc-drawer-link"
              onClick={() => onOpenFullPage(doc.id)}
            >
              Open
            </button>
          ) : null}

          <button
            type="button"
            className="doc-drawer-icon"
            onClick={onClose}
            aria-label="Close drawer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {!doc ? (
          <div className="doc-drawer-empty">
            <div className="doc-drawer-empty-title">No document selected</div>
            <div className="doc-drawer-empty-sub">
              Click a document card to preview it here.
            </div>
          </div>
        ) : (
          <div className="doc-drawer-content">
            <div className="doc-drawer-title">{doc.title}</div>
            <div className="doc-drawer-meta">{doc.category}</div>

            <div className="doc-drawer-section">
              <div className="doc-drawer-label">Summary</div>
              <div className="doc-drawer-text">{doc.summary}</div>
            </div>

            <div className="doc-drawer-section">
              <div className="doc-drawer-label">Content</div>
              <div className="doc-drawer-text prewrap">{doc.content}</div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}