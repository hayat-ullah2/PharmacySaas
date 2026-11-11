import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "navy";

const toneStyles: Record<Tone, { bg: string; text: string }> = {
  primary: { bg: "bg-primary-50", text: "text-primary-600" },
  success: { bg: "bg-success-50", text: "text-success-600" },
  warning: { bg: "bg-warning-50", text: "text-warning-600" },
  danger: { bg: "bg-danger-50", text: "text-danger-600" },
  info: { bg: "bg-info-50", text: "text-info-600" },
  navy: { bg: "bg-navy-100", text: "text-navy-600" },
};

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  delta,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: Tone;
  delta?: { value: string; up: boolean };
  hint?: string;
}) {
  const s = toneStyles[tone];
  return (
    <div className="rounded-[var(--radius-card)] border border-navy-200/70 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-navy-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-navy-900">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            s.bg,
            s.text,
          )}
        >
          {icon}
        </div>
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                delta.up
                  ? "bg-success-50 text-success-700"
                  : "bg-danger-50 text-danger-700",
              )}
            >
              {delta.up ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {delta.value}
            </span>
          )}
          {hint && <span className="text-xs text-navy-400">{hint}</span>}
        </div>
      )}
    </div>
  );
}
