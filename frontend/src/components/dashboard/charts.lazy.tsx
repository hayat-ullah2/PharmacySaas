"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/States";

// recharts (+ its d3 deps) is a large bundle. It's only ever shown inside these
// chart widgets on the dashboard and report pages, so we split it into its own
// chunk and load it on demand — the rest of the app (login, POS, lists) no
// longer ships it. A matching skeleton holds the layout so there's no flash or
// shift while the chunk downloads. ssr:false because the charts are purely
// client-side (ResponsiveContainer needs a real DOM to measure).

function BarAreaSkeleton() {
  return (
    <div className="h-64 w-full p-1">
      <div className="flex h-full items-end gap-3">
        {[60, 85, 45, 70, 90, 55, 75].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <Skeleton className="h-44 w-44 shrink-0 rounded-full" />
      <ul className="flex-1 space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-8" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export const SalesChart = dynamic(
  () => import("./SalesChart").then((m) => m.SalesChart),
  { ssr: false, loading: () => <BarAreaSkeleton /> },
);

export const DonutChart = dynamic(
  () => import("./Charts").then((m) => m.DonutChart),
  { ssr: false, loading: () => <DonutSkeleton /> },
);

export const CategoryBarChart = dynamic(
  () => import("./Charts").then((m) => m.CategoryBarChart),
  { ssr: false, loading: () => <BarAreaSkeleton /> },
);

export const TrendBarChart = dynamic(
  () => import("./Charts").then((m) => m.TrendBarChart),
  { ssr: false, loading: () => <BarAreaSkeleton /> },
);
