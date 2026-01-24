import type { DocumentItem } from "../../../api/documentsClient";

type Props = {
    doc: DocumentItem;
    active: boolean;
    isFavorite: boolean;
    isAdmin: boolean;
    isMenuOpen: boolean;

    onOpen: () => void;
    onToggleFavorite: (id: number) => void;
    onToggleMenu: (id: number) => void;
    onCloseMenu: () => void;
    onDelete: (doc: DocumentItem) => void;
};

import Menu from "../../../components/menu/Menu";

export default function DocumentRow({
    doc,
    active,
    isFavorite,
    isAdmin,
    isMenuOpen,
    onOpen,
    onToggleFavorite,
    onToggleMenu,
    onCloseMenu,
    onDelete,
}: Props) {
    return (
        <div
            className={`doc-row ${active ? "is-active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => e.key === "Enter" && onOpen()}
        >
            <div className="doc-row-main">
                <div className="doc-row-title" title={doc.title}>
                    {doc.title}
                </div>
                <div className="doc-row-meta">{doc.category}</div>
            </div>

            <div className="doc-row-actions" onClick={(e) => e.stopPropagation()}>
                <button
                    className={`icon-btn ${isFavorite ? "active" : ""}`}
                    type="button"
                    onClick={() => onToggleFavorite(doc.id)}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    {isFavorite ? "★" : "☆"}
                </button>

                {isAdmin && (
                    <div className="menu-wrap">
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
    );
}