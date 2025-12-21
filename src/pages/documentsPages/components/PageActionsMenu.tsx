import Menu from "../../../components/menu/Menu";

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onExport: () => void;
  onImport: (mode: "merge" | "replace") => void;
};

export default function PageActionsMenu({
  open,
  onToggle,
  onClose,
  onExport,
  onImport,
}: Props) {
  return (
    <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        className="icon-btn"
        type="button"
        aria-label="Actions"
        title="Actions"
        onClick={onToggle}
      >
        ⋯
      </button>

      <Menu open={open} onClose={onClose}>
        <button
          className="menu-item"
          type="button"
          role="menuitem"
          onClick={() => {
            onExport();
            onClose();
          }}
        >
          Export JSON
        </button>

        <button
          className="menu-item"
          type="button"
          role="menuitem"
          onClick={() => {
            onImport("merge");
            onClose();
          }}
        >
          Import JSON (Merge)
        </button>

        <button
          className="menu-item danger"
          type="button"
          role="menuitem"
          onClick={() => {
            onImport("replace");
            onClose();
          }}
        >
          Import JSON (Replace)
        </button>
      </Menu>
    </div>
  );
}
