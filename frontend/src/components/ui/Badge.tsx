import { cn } from "@/lib/utils";

export type BadgeTone =
  | "navy"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

const tones: Record<BadgeTone, string> = {
  navy: "bg-navy-100 text-navy-700 ring-navy-200",
  primary: "bg-primary-50 text-primary-700 ring-primary-200",
  success: "bg-success-50 text-success-700 ring-success-100",
  warning: "bg-warning-50 text-warning-700 ring-warning-100",
  danger: "bg-danger-50 text-danger-700 ring-danger-100",
  info: "bg-info-50 text-info-600 ring-info-100",
};

export function Badge({
  tone = "navy",
  children,
  className,
  dot,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-navy-500": tone === "navy",
            "bg-primary-500": tone === "primary",
            "bg-success-500": tone === "success",
            "bg-warning-500": tone === "warning",
            "bg-danger-500": tone === "danger",
            "bg-info-500": tone === "info",
          })}
        />
      )}
      {children}
    </span>
  );
}
