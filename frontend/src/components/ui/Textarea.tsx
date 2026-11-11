"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, id, ...props }, ref) => {
    const autoId = useId();
    const areaId = id || autoId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={areaId}
            className="mb-1.5 block text-sm font-medium text-navy-700"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={cn(
            "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none",
            className,
          )}
          {...props}
        />
        {hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
