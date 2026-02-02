import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./menu.scss";

export type MenuItem = {
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
  ref?: React.RefObject<HTMLButtonElement>;
};

type Align = "left" | "right";

type Props = {
  open: boolean;
  onClose: () => void;
  items?: MenuItem[];
  children?: React.ReactNode;
  align?: Align;
  minWidth?: number;

  // NEW
  anchorRef: React.RefObject<HTMLElement | null>
  offset?: number;
};

type Pos = { top: number; left: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Menu({
  open,
  onClose,
  items,
  children,
  align = "right",
  minWidth = 180,
  anchorRef,
  offset = 8,
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 });


  // Positioning
  useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el) return;

    const compute = () => {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Start below the button
      const top = clamp(r.bottom + offset, 8, vh - 8);

      // Left based on align
      const rawLeft = align === "right" ? r.right - minWidth : r.left;
      const left = clamp(rawLeft, 8, vw - minWidth - 8);

      setPos({ top, left });
    };

    compute();

    // Recompute on scroll/resize (important because we are fixed)
    const onWin = () => compute();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true); // capture scroll inside containers too

    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, anchorRef, align, minWidth, offset]);

  // Close handlers
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

      const target = e.target as Node;
      // click outside closes
      if (!el.contains(target)) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`menu ${align === "left" ? "left" : "right"}`}
      role="menu"
      style={{
        minWidth,
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items?.length ? (
        items.map((item, idx) => (
          <button
            ref={item.ref}
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
    </div>,
    document.body,
  );
}
