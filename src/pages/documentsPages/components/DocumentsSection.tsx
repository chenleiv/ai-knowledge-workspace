import type { DocumentItem } from "../types";
import DocumentCard from "./DocumentCard";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

type Props = {
  title: string;
  docs: DocumentItem[];
  pins: Record<number, boolean>;
  favorites: Record<number, boolean>;
  onToggleFavorite: (id: number) => void;
  onEdit: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
};

export default function DocumentsSection({
  title,
  docs,
  favorites,
  onToggleFavorite,
  onEdit,
  onDelete,
}: Props) {
  const ids = docs.map((d) => d.id);

  return (
    <section className="section">
      <div className="section-title">{title}</div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="docs-grid">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isFavorite={!!favorites[doc.id]}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
