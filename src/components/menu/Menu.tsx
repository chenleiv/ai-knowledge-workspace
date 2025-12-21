import "./menu.scss";

export type MenuItem = {
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items?: MenuItem[];
  children?: React.ReactNode;
  align?: "left" | "right";
  minWidth?: number;
};

export default function Menu({
  open,
  onClose,
  items,
  children,
  align = "right",
  minWidth = 180,
}: Props) {
  if (!open) return null;

  return (
    <div
      className={`menu ${align === "left" ? "left" : "right"}`}
      role="menu"
      style={{ minWidth }}
      onClick={(e) => e.stopPropagation()}
    >
      {items?.length ? (
        items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            role="menuitem"
            className={`menu-item ${item.danger ? "danger" : ""}`}
            disabled={item.disabled}
            onClick={async () => {
              if (item.disabled) return;
              await item.onClick();
              onClose();
            }}
          >
            {item.label}
          </button>
        ))
      ) : (
        <>{children}</>
      )}
    </div>
  );
}
