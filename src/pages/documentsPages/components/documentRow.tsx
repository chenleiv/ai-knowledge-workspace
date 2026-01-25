import type { DocumentItem } from "../../../api/documentsClient";
import Menu from "../../../components/menu/Menu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: doc.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`doc-row ${active ? "is-active" : ""} ${isDragging ? "is-dragging" : ""
                }`}
            onClick={onOpen}
            onKeyDown={(e) => e.key === "Enter" && onOpen()}
            {...attributes}
            {...listeners}
        >
            <div className="doc-row-main">
                <div className="doc-row-title" title={doc.title}>
                    {doc.title}
                </div>
                <div className="doc-row-meta">{doc.category}</div>
            </div>

            <div className="doc-row-actions no-dnd" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <div className="menu-wrap no-dnd" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
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
                                label: isFavorite ? "Remove from favorites" : "Add to favorites",
                                onClick: () => onToggleFavorite(doc.id),
                            },
                            ...(isAdmin
                                ? [
                                    {
                                        label: "Delete",
                                        danger: true,
                                        onClick: () => onDelete(doc),
                                    },
                                ]
                                : []),
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}