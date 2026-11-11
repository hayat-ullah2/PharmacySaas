"use client";

import Link from "next/link";
import {
  BarChart3,
  Truck,
  Boxes,
  LineChart,
  CalendarClock,
  Users,
  Building2,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "navy";

const toneStyles: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-info-50 text-info-600",
  navy: "bg-navy-100 text-navy-600",
};

interface ReportDef {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: Tone;
  href: string;
}

const REPORTS: ReportDef[] = [
  { title: "Sales Report", description: "Revenue, orders, and top categories over any period.", icon: <BarChart3 className="h-5 w-5" />, tone: "primary", href: "/admin/reports/sales" },
  { title: "Purchase Report", description: "Purchase orders, spend by supplier, and receipts.", icon: <Truck className="h-5 w-5" />, tone: "info", href: "/admin/reports/purchases" },
  { title: "Inventory Report", description: "Stock levels, valuation, and low-stock exposure.", icon: <Boxes className="h-5 w-5" />, tone: "success", href: "/admin/reports/inventory" },
  { title: "Profit Report", description: "Revenue vs. cost of goods, margins, and analytics.", icon: <LineChart className="h-5 w-5" />, tone: "warning", href: "/admin/reports/profit" },
  { title: "Expiry Report", description: "Batches expiring soon and value at risk.", icon: <CalendarClock className="h-5 w-5" />, tone: "danger", href: "/admin/reports/expiry" },
  { title: "Supplier Report", description: "Supplier performance, balances, and history.", icon: <Building2 className="h-5 w-5" />, tone: "navy", href: "/admin/suppliers" },
  { title: "Customer Report", description: "Customer spend, loyalty, and outstanding dues.", icon: <Users className="h-5 w-5" />, tone: "primary", href: "/admin/customers" },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Explore reports across sales, inventory, and finance. Each report has its own filters and CSV export."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Reports" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className="group block h-full rounded-[var(--radius-card)] border border-navy-200/70 bg-white p-5 text-left shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneStyles[r.tone])}>
              {r.icon}
            </span>
            <h3 className="mt-4 text-base font-semibold text-navy-900">{r.title}</h3>
            <p className="mt-1 text-sm text-navy-500">{r.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:text-primary-700">
              View report <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
