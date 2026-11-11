"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, icon, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-navy-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-10 w-full rounded-lg border bg-white px-3 text-sm text-navy-900 placeholder:text-navy-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-navy-50",
              icon ? "pl-9" : "",
              error ? "border-danger-400" : "border-navy-200",
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-danger-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-navy-400">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
