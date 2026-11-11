"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const dims =
    size === "sm"
      ? { track: "h-4 w-7", knob: "h-3 w-3", move: "translate-x-3" }
      : { track: "h-5 w-9", knob: "h-4 w-4", move: "translate-x-4" };
  return (
    <label className={cn("inline-flex items-center gap-2", disabled && "opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full transition-colors",
          dims.track,
          checked ? "bg-primary-600" : "bg-navy-300",
        )}
      >
        <span
          className={cn(
            "inline-block transform rounded-full bg-white shadow transition-transform",
            dims.knob,
            checked ? dims.move : "translate-x-0.5",
          )}
        />
      </button>
      {label && <span className="text-sm text-navy-700">{label}</span>}
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2", disabled && "opacity-50")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-navy-300 text-primary-600 focus:ring-primary-500 focus:ring-2 accent-primary-600"
      />
      {label && <span className="text-sm text-navy-700">{label}</span>}
    </label>
  );
}
