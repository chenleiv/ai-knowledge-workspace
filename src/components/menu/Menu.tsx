import { useEffect, useRef } from "react";
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
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = menuRef.current;
      if (!el) return;

      // click outside closes
      if (!el.contains(e.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
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
