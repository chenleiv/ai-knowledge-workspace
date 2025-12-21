import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DocumentItem } from "../../../api/documentsClient";
import { makePreview } from "../utils/ordering";
import Menu from "../../../components/menu/Menu";

type Props = {
  doc: DocumentItem;
  isFavorite: boolean;
  isMenuOpen: boolean;
  onToggleFavorite: (id: number) => void;
  onOpen: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
  onToggleMenu: (id: number) => void;
  onCloseMenu: () => void;
};

export default function SortableDocumentCard({
  doc,
  isFavorite,
  isMenuOpen,
  onToggleFavorite,
  onOpen,
  onDelete,
  onToggleMenu,
  onCloseMenu,
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

  const preview = makePreview(doc, 160);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`doc-card ${isDragging ? "is-dragging" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(doc)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(doc);
      }}
    >
      <div className="doc-card-header">
        <button
          className="drag-handle"
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag"
          title="Drag"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </button>

        <div className="doc-header-main">
          <h3 className="doc-title">{doc.title}</h3>
          <div className="doc-meta">{doc.category}</div>
        </div>

        <div className="doc-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`icon-btn ${isFavorite ? "active" : ""}`}
            type="button"
            onClick={() => onToggleFavorite(doc.id)}
            aria-label="Toggle favorite"
            title="Favorite"
          >
            {isFavorite ? "★" : "☆"}
          </button>

          <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-btn"
              type="button"
              aria-label="Menu"
              title="Menu"
              onClick={() => onToggleMenu(doc.id)}
            >
              ⋯
            </button>

            <Menu
              open={isMenuOpen}
              onClose={onCloseMenu}
              items={[
                {
                  label: "Delete",
                  danger: true,
                  onClick: () => onDelete(doc),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {preview && <p className="doc-preview">{preview}</p>}
    </article>
  );
}
