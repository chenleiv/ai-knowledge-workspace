import type { DocumentInput } from "../types";

type Props = {
  title: string;
  form: DocumentInput;
  setForm: (updater: (prev: DocumentInput) => DocumentInput) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

export default function DocumentDrawer({
  title,
  form,
  setForm,
  isSaving,
  onSave,
  onClose,
}: Props) {
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="drawer-header">
          <h3>{title}</h3>
          <button className="secondary-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="drawer-form">
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
            />
          </label>

          <label>
            Category
            <input
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
            />
          </label>

          <label>
            Summary
            <input
              value={form.summary}
              onChange={(e) =>
                setForm((p) => ({ ...p, summary: e.target.value }))
              }
            />
          </label>

          <label>
            Content
            <textarea
              rows={10}
              value={form.content}
              onChange={(e) =>
                setForm((p) => ({ ...p, content: e.target.value }))
              }
            />
          </label>

          <div className="drawer-actions">
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
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
