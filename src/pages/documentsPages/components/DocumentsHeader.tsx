import PageActionsMenu from "./PageActionsMenu";

type Props = {
  onNew: () => void;
  pageMenuOpen: boolean;
  onTogglePageMenu: () => void;
  onClosePageMenu: () => void;
  onExport: () => void;
  onImport: (mode: "merge" | "replace") => void;
};

export default function DocumentsHeader({
  onNew,
  pageMenuOpen,
  onTogglePageMenu,
  onClosePageMenu,
  onExport,
  onImport,
}: Props) {
  return (
    <div className="documents-header" onClick={(e) => e.stopPropagation()}>
      <div>
        <h2>Documents</h2>
      </div>

      <div className="top-actions">
        <button className="primary-btn" type="button" onClick={onNew}>
          New Document
        </button>

        <PageActionsMenu
          open={pageMenuOpen}
          onToggle={onTogglePageMenu}
          onClose={onClosePageMenu}
          onExport={onExport}
          onImport={onImport}
        />
      </div>
    </div>
  );
}
