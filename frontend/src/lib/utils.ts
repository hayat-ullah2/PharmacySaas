import type { StockStatus } from "./types";

type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | Record<string, boolean | undefined | null>
  | ClassValue[];

/** Tiny clsx-style classnames joiner (avoids extra deps). */
export function cn(...parts: ClassValue[]): string {
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === "string" || typeof part === "number") {
      out.push(String(part));
    } else if (Array.isArray(part)) {
      const inner = cn(...part);
      if (inner) out.push(inner);
    } else if (typeof part === "object") {
      for (const [key, val] of Object.entries(part)) {
        if (val) out.push(key);
      }
    }
  }
  return out.join(" ");
}

/** Format a number as Pakistani Rupees, e.g. Rs 184,500. */
export function formatRs(value: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(value) >= 1_000_000) {
    return `Rs ${(value / 1_000_000).toFixed(2)}M`;
  }
  if (opts?.compact && Math.abs(value) >= 1_000) {
    return `Rs ${(value / 1_000).toFixed(1)}K`;
  }
  return `Rs ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/** Format an ISO date string as e.g. "26 Sep 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export const stockStatusMeta: Record<
  StockStatus,
  { label: string; tone: "success" | "warning" | "danger" | "navy" }
> = {
  healthy: { label: "Healthy", tone: "success" },
  low: { label: "Low Stock", tone: "warning" },
  expiring: { label: "Expiring Soon", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
  out: { label: "Out of Stock", tone: "danger" },
};

/** Deterministic initials from a name. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

/** Slice an array into pages. */
export function paginate<T>(items: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}
