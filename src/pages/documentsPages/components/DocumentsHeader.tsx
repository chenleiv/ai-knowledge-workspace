import { useAuth } from "../../../auth/Auth";
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="documents-header" onClick={(e) => e.stopPropagation()}>
      <div>
        <h2>Documents</h2>
      </div>

      {isAdmin && (
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
      )}
      {!isAdmin && (
        <button className="secondary-btn" type="button" onClick={onExport}>
          Export json
        </button>
      )}
    </div>
  );
}
