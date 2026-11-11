"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

const MENU_WIDTH = 176; // 11rem
const GAP = 6;

export function Dropdown({
  trigger,
  items,
  align = "right",
  className,
}: {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position the fixed menu relative to the trigger, escaping any overflow
  // container. Flip upward when there isn't room below.
  useLayoutEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const estHeight = items.reduce((acc, it) => acc + (it.divider ? 9 : 40), 8);
    const openUp = r.bottom + GAP + estHeight > window.innerHeight && r.top - GAP - estHeight > 0;
    const top = openUp ? r.top - GAP - estHeight : r.bottom + GAP;
    let left = align === "right" ? r.right - MENU_WIDTH : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));
    setCoords({ top, left });
  }, [open, align, items]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Close on scroll/resize so the fixed menu never floats out of place.
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  return (
    <div ref={triggerRef} className={cn("relative", className)}>
      {/* Capture-phase toggle: runs before the trigger's own onClick (which may
          call stopPropagation to avoid row navigation), so the menu always opens. */}
      <div onClickCapture={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>{trigger}</div>
      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="animate-scale-in min-w-[11rem] overflow-hidden rounded-xl border border-navy-200 bg-white py-1 shadow-pop"
          role="menu"
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 h-px bg-navy-100" />
            ) : (
              <button
                key={i}
                role="menuitem"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                  item.danger
                    ? "text-danger-600 hover:bg-danger-50"
                    : "text-navy-700 hover:bg-navy-50",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
