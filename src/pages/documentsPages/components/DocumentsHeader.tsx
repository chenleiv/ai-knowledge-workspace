import { useState } from "react";
import ImportMenuButton from "./ImportMenuButton";

type Props = {
  onNew: () => void;
  onExport: () => Promise<void> | void;
  onImport: (mode: "merge" | "replace") => void;
  isAdmin: boolean;
};

export default function DocumentsHeader({
  onNew,
  onExport,
  onImport,
  isAdmin,
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
      {isAdmin ? (
        <>
          <button className="primary-btn" type="button" onClick={onNew}>
            Create New Document
          </button>

          <div className="top-actions-buttons">
            <button
              className="text-btn"
              type="button"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export"}
            </button>

            <ImportMenuButton onImport={onImport} />
          </div>
        </>
      ) : (
        <button
          className="text-btn"
          type="button"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Export JSON"}
        </button>
      )}
    </div>
  );
}
