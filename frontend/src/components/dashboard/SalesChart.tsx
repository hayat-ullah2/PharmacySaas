"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SALES_TREND } from "@/lib/data";
import { formatRs } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SalesChart({ showPurchases = true }: { showPurchases?: boolean }) {
  const [range, setRange] = useState<7 | 30>(7);
  const data = SALES_TREND.slice(-range);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-navy-500">
            <span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> Sales
          </span>
          {showPurchases && (
            <span className="inline-flex items-center gap-1.5 text-navy-500">
              <span className="h-2.5 w-2.5 rounded-full bg-navy-300" /> Purchases
            </span>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-navy-200 bg-navy-50 p-0.5">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                range === r
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-navy-500 hover:text-navy-700",
              )}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="purchFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                boxShadow: "0 10px 30px -8px rgb(15 23 42 / 0.18)",
              }}
              formatter={(value, name) => [
                formatRs(Number(value)),
                name === "sales" ? "Sales" : "Purchases",
              ]}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#salesFill)"
            />
            {showPurchases && (
              <Area
                type="monotone"
                dataKey="purchases"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#purchFill)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
