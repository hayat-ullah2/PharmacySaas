import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "warning" | "danger" | "info" | "success";

const tones: Record<Tone, { bar: string; icon: string; bg: string }> = {
  warning: { bar: "bg-warning-500", icon: "text-warning-600", bg: "bg-warning-50" },
  danger: { bar: "bg-danger-500", icon: "text-danger-600", bg: "bg-danger-50" },
  info: { bar: "bg-info-500", icon: "text-info-600", bg: "bg-info-50" },
  success: { bar: "bg-success-500", icon: "text-success-600", bg: "bg-success-50" },
};

export function AlertRow({
  icon,
  title,
  tone,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  tone: Tone;
  href?: string;
}) {
  const t = tones[tone];
  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-navy-100 p-3 transition hover:border-navy-200 hover:bg-navy-50/50">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.bg, t.icon)}>
        {icon}
      </span>
      <p className="flex-1 text-sm text-navy-700">{title}</p>
      {href && <ChevronRight className="h-4 w-4 text-navy-300" />}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
