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
  isAdmin: boolean;
};

export default function DocumentCard({
  doc,
  isFavorite,
  isMenuOpen,
  onToggleFavorite,
  onOpen,
  onDelete,
  onToggleMenu,
  onCloseMenu,
  isAdmin,
}: Props) {
  const preview = makePreview(doc, 160);

  return (
    <article
      className="doc-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(doc)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(doc);
      }}
    >
      <div className="doc-card-header">
        <div className="doc-header-main">
          <h3 className="doc-title">{doc.title}</h3>
          <div className="doc-meta">{doc.category}</div>
        </div>

        <div className="doc-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`icon-btn ${isFavorite ? "active" : ""}`}
            type="button"
            onClick={() => onToggleFavorite(doc.id)}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "★" : "☆"}
          </button>

          {isAdmin && (
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
          )}
        </div>
      </div>

      {preview ? <p className="doc-preview">{preview}</p> : null}
    </article>
  );
}
