import { useState } from "react";
import ImportMenuButton from "./ImportMenuButton";
import { FilePlusCorner, Star } from "lucide-react";

type Props = {
  onNew: () => void;
  onExport: () => Promise<void> | void;
  onImport: (mode: "merge" | "replace") => void;
  isAdmin: boolean;
  showOnlyFavorites: boolean;
  onToggleFavorites: () => void;
};

export default function DocumentsHeader({
  onNew,
  onExport,
  onImport,
  isAdmin,
  showOnlyFavorites,
  onToggleFavorites,
}: Props) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="top-actions" onClick={(e) => e.stopPropagation()}>
      <div className="actions-buttons">
        {isAdmin && <ImportMenuButton onImport={onImport} />}

        <button
          className="text-btn"
          type="button"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Export"}
        </button>
      </div>
      <button
        className={`add-btn favorite-buttons text-btn ${showOnlyFavorites ? "active" : ""}`}
        type="button"
        onClick={onToggleFavorites}
        title={showOnlyFavorites ? "Show all documents" : "Show only favorites"}
      >
        <Star size={20} fill={showOnlyFavorites ? "currentColor" : "none"} />
      </button>
      <button className="add-btn text-btn" type="button" onClick={onNew}>
        <FilePlusCorner />
      </button>
    </div>
  );
}
