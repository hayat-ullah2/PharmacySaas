"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-navy-200",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-primary-700"
                : "text-navy-500 hover:text-navy-800",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {item.label}
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-primary-100 text-primary-700"
                      : "bg-navy-100 text-navy-500",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
