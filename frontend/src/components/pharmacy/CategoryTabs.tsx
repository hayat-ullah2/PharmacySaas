"use client";

import { cn } from "@/lib/utils";

export function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition",
            active === c
              ? "border-primary-600 bg-primary-600 text-white shadow-sm"
              : "border-navy-200 bg-white text-navy-600 hover:border-primary-300 hover:text-primary-700",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
