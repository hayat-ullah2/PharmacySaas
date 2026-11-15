"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** Small helper text shown under the control. */
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, placeholder, hint, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;
    const hintId = hint ? `${selectId}-hint` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-navy-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-describedby={hintId}
            className={cn(
              "h-10 w-full appearance-none rounded-lg border border-navy-200 bg-white pl-3 pr-9 text-sm text-navy-900 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-navy-50",
              className,
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        </div>
        {hint && (
          <p id={hintId} className="mt-1 text-xs text-navy-400">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
