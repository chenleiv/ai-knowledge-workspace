import { useMemo } from "react";
import type { DocumentItem } from "../../../api/documentsClient";

type Props = {
  docs: DocumentItem[];
  loading: boolean;
  error: string | null;

  selectedIds: number[];
  contextQuery: string;

  onRefresh: () => void;
  onToggleSelected: (id: number) => void;
  onChangeQuery: (value: string) => void;
};

export default function ContextPanel({
  docs,
  loading,
  error,
  selectedIds,
  contextQuery,
  onRefresh,
  onToggleSelected,
  onChangeQuery,
}: Props) {
  const filteredDocs = useMemo(() => {
    const q = contextQuery.toLowerCase().trim();
    if (!q) return docs;

    return docs.filter((d) => {
      return (
        (d.title || "").toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q) ||
        (d.summary || "").toLowerCase().includes(q)
      );
    });
  }, [docs, contextQuery]);

  return (
    <aside className="context-panel">
      <div className="context-header">
        <div>
          <h2>Context</h2>
          <p>Select documents the assistant can use.</p>
        </div>

        <button
          className="secondary-btn"
          type="button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="context-search">
        <input
          value={contextQuery}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Search documents..."
        />
        <div className="context-count">{selectedIds.length} selected</div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="context-list">
        {filteredDocs.map((d) => {
          const checked = selectedIds.includes(d.id);
          return (
            <label
              key={d.id}
              className={`context-item ${checked ? "checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleSelected(d.id)}
              />
              <div className="context-item-main">
                <div className="context-title">{d.title}</div>
                <div className="context-meta">{d.category}</div>
              </div>
            </label>
          );
        })}

        {!loading && filteredDocs.length === 0 && (
          <div className="empty">No documents match this search.</div>
        )}
      </div>
    </aside>
  );
}
