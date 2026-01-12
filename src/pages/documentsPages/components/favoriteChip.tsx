import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DocumentItem } from "../../../api/documentsClient";

type Props = {
  doc: DocumentItem;
  editable: boolean;
  onOpen: (id: number) => void;
};

export default function FavoriteChip({ doc, editable, onOpen }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id, disabled: !editable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`fav-chip ${editable ? "is-editable" : ""}`}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (editable) {
          e.preventDefault();
          return;
        }
        onOpen(doc.id);
      }}
      title={editable ? "Drag to reorder" : `Open "${doc.title}"`}
    >
      <span className="fav-chip-star">★</span>
      <span className="fav-chip-text">{doc.title}</span>
    </button>
  );
}
