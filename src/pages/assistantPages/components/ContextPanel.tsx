import { useCallback, useMemo } from "react";
import type { DocumentItem } from "../../../api/documentsClient";

type Props = {
  docs: DocumentItem[];
  loading: boolean;
  error: string | null;

  selectedIds: number[]; // empty => "All documents"
  contextQuery: string;

  onToggleSelected: (id: number) => void;
  onChangeQuery: (value: string) => void;
  onClearSelection: () => void;
};

function matchesQuery(d: DocumentItem, q: string) {
  const title = (d.title ?? "").toLowerCase();
  const category = (d.category ?? "").toLowerCase();
  const summary = (d.summary ?? "").toLowerCase();

  return title.includes(q) || category.includes(q) || summary.includes(q);
}

export default function ContextPanel({
  docs,
  loading,
  error,
  selectedIds,
  contextQuery,
  onToggleSelected,
  onChangeQuery,
  onClearSelection,
}: Props) {
  const filteredDocs = useMemo(() => {
    const q = contextQuery.toLowerCase().trim();
    if (!q) return docs;
    return docs.filter((d) => matchesQuery(d, q));
  }, [docs, contextQuery]);

  const hasSelection = selectedIds.length > 0;

  const hint = hasSelection
    ? `Use only selected documents. (${selectedIds.length} selected)`
    : "No selection — Use all documents.";

  const isSelected = useCallback(
    (id: number) => selectedIds.includes(id),
    [selectedIds]
  );

  const handleToggle = useCallback(
    (id: number) => onToggleSelected(id),
    [onToggleSelected]
  );

  const handleClear = useCallback(() => {
    onClearSelection();
  }, [onClearSelection]);

  return (
    <aside className="context-panel">
      <div className="context-hint"> Select specific documents to narrow context.</div>
      <div className="context-search">
        <input
          value={contextQuery}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Search documents..."
          disabled={loading}
        />
      </div>

      <div className="context-header-hint">
        <div className="context-hint">{hint}</div>
        <button
          className="text-btn"
          type="button"
          onClick={handleClear}
          disabled={loading}
        >
          Clear
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="context-list">
        {filteredDocs.map((d) => {
          const checked = isSelected(d.id);

          return (
            <div
              key={d.id}
              className={`context-item ${checked ? "checked" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={checked}
              onClick={() => handleToggle(d.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggle(d.id);
                }
              }}
            >
              <div className="context-item-main">
                <div className="context-title">{d.title}</div>
                <div className="context-meta">{d.category}</div>
              </div>
            </div>
          );
        })}

        {!loading && filteredDocs.length === 0 && (
          <div className="empty">No documents match this search.</div>
        )}
      </div>
    </aside>
  );
}
