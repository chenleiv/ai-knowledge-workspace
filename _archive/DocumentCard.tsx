import type { DocumentItem } from "../types";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  doc: DocumentItem;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onEdit: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
};

export default function DocumentCard({
  doc,
  isFavorite,
  onToggleFavorite,
  onEdit,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} className="doc-card">
      <div className="doc-card-header">
        <button
          className="drag-handle"
          type="button"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        <div className="doc-header-main">
          <h3 className="doc-title">{doc.title}</h3>
          <div className="doc-meta">{doc.category}</div>
        </div>

        <div className="doc-flags">
          <button
            className={`icon-btn ${isFavorite ? "active" : ""}`}
            type="button"
            onClick={() => onToggleFavorite(doc.id)}
            aria-label="Toggle favorite"
            title="Favorite"
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
      </div>

      <p className="doc-summary">{doc.summary}</p>

      <div className="doc-card-footer">
        <button
          className="secondary-btn"
          type="button"
          onClick={() => onEdit(doc)}
        >
          Edit
        </button>
        <button
          className="danger-btn"
          type="button"
          onClick={() => onDelete(doc)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
