import { useState } from "react";
import PageActionsMenu from "./PageActionsMenu";

type Props = {
  onNew: () => void;
  pageMenuOpen: boolean;
  onTogglePageMenu: () => void;
  onClosePageMenu: () => void;
  onExport: () => Promise<void> | void;
  onImport: (mode: "merge" | "replace") => void;
  isAdmin: boolean;
};

export default function DocumentsHeader({
  onNew,
  pageMenuOpen,
  onTogglePageMenu,
  onClosePageMenu,
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
      onClosePageMenu();
    }
  }

  return (
    <div className="documents-header" onClick={(e) => e.stopPropagation()}>
      <div>
        <h2>Documents</h2>
      </div>

      <div className="top-actions">
        {isAdmin ? (
          <>
            <button className="primary-btn" type="button" onClick={onNew}>
              New Document
            </button>

            <PageActionsMenu
              open={pageMenuOpen}
              onToggle={onTogglePageMenu}
              onClose={onClosePageMenu}
              onExport={handleExport}
              onImport={onImport}
            />
          </>
        ) : (
          <button
            className="secondary-btn"
            type="button"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export JSON"}
          </button>
        )}
      </div>
    </div>
  );
}
