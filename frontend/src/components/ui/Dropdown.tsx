"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Capture-phase toggle: runs before the trigger's own onClick (which may
          call stopPropagation to avoid row navigation), so the menu always opens. */}
      <div onClickCapture={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "animate-scale-in absolute z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-navy-200 bg-white py-1 shadow-pop",
            align === "right" ? "right-0" : "left-0",
          )}
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
        </div>
      )}
    </div>
  );
}
