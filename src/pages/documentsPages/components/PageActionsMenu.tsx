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

      <Menu
        open={open}
        onClose={onClose}
        items={[
          { label: "Export JSON", onClick: onExport },
          { label: "Import JSON (Merge)", onClick: () => onImport("merge") },
          {
            label: "Import JSON (Replace)",
            danger: true,
            onClick: () => onImport("replace"),
          },
        ]}
      />
    </div>
  );
}
