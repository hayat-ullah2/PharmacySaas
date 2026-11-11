"use client";

import Link from "next/link";
import {
  Wallet,
  Truck,
  Boxes,
  PackageX,
  CalendarClock,
  FileText,
  TrendingDown,
  AlertTriangle,
  Trash2,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { DonutChart } from "@/components/dashboard/Charts";
import { AlertRow } from "@/components/dashboard/AlertCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { KPI, SALES, PURCHASES, MEDICINES, INVENTORY_BREAKDOWN } from "@/lib/data";
import { formatRs, formatNumber, formatDate } from "@/lib/utils";
import type { Sale } from "@/lib/types";

const columns: Column<Sale>[] = [
  {
    key: "invoice",
    header: "Invoice",
    render: (s) => <span className="font-medium text-navy-900">{s.invoice}</span>,
  },
  { key: "customer", header: "Customer" },
  {
    key: "items",
    header: "Items",
    align: "center",
    hideOnMobile: true,
    render: (s) => s.itemCount,
  },
  {
    key: "total",
    header: "Amount",
    align: "right",
    render: (s) => <span className="font-semibold text-navy-900">{formatRs(s.total)}</span>,
  },
  {
    key: "payment",
    header: "Payment",
    hideOnMobile: true,
    render: (s) => <span className="capitalize text-navy-600">{s.payment}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (s) => <StatusBadge status={s.status} />,
  },
  {
    key: "date",
    header: "Date",
    align: "right",
    hideOnMobile: true,
    render: (s) => <span className="text-navy-500">{formatDate(s.date)}</span>,
  },
];

/** Day-over-day change, expressed as a StatCard delta. Undefined when there's no prior-day baseline to compare against. */
function trend(current: number, previous: number): { value: string; up: boolean } | undefined {
  if (previous <= 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  return { value: `${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const today = isoDaysAgo(0);
  const yesterday = isoDaysAgo(1);

  const sales = [...SALES];
  const purchases = [...PURCHASES];

  const salesYesterday = sales
    .filter((s) => s.date === yesterday)
    .reduce((sum, s) => sum + s.total, 0);
  const purchasesToday = purchases
    .filter((p) => p.date === today)
    .reduce((sum, p) => sum + p.total, 0);
  const purchasesYesterday = purchases
    .filter((p) => p.date === yesterday)
    .reduce((sum, p) => sum + p.total, 0);

  const recentSales = sales
    .slice()
    .sort((a, b) => (a.date === b.date ? b.invoice.localeCompare(a.invoice) : b.date.localeCompare(a.date)))
    .slice(0, 6);

  const outOfStock = [...MEDICINES].filter((m) => m.status === "out");

  const alerts = [
    {
      show: KPI.lowStock > 0,
      tone: "warning" as const,
      icon: <AlertTriangle className="h-4 w-4" />,
      title: `${KPI.lowStock} ${KPI.lowStock === 1 ? "medicine is" : "medicines are"} below reorder level.`,
      href: "/admin/inventory/low-stock",
    },
    {
      show: KPI.expiringSoon > 0,
      tone: "warning" as const,
      icon: <CalendarClock className="h-4 w-4" />,
      title: `${KPI.expiringSoon} ${KPI.expiringSoon === 1 ? "batch expires" : "batches expire"} within 90 days.`,
      href: "/admin/inventory/expiring",
    },
    {
      show: KPI.expired > 0,
      tone: "danger" as const,
      icon: <Trash2 className="h-4 w-4" />,
      title: `${KPI.expired} ${KPI.expired === 1 ? "batch is" : "batches are"} already expired.`,
      href: "/admin/inventory/expired",
    },
    {
      show: KPI.pendingPrescriptions > 0,
      tone: "info" as const,
      icon: <ClipboardList className="h-4 w-4" />,
      title: `${KPI.pendingPrescriptions} ${KPI.pendingPrescriptions === 1 ? "prescription requires" : "prescriptions require"} review.`,
      href: "/admin/prescriptions",
    },
    {
      show: outOfStock.length > 0,
      tone: "danger" as const,
      icon: <PackageX className="h-4 w-4" />,
      title:
        outOfStock.length === 1
          ? `${outOfStock[0].name} is out of stock.`
          : `${outOfStock.length} medicines are out of stock.`,
      href: "/admin/medicines",
    },
  ].filter((a) => a.show);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's what's happening at your pharmacy today."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Dashboard" }]}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Today's Sales"
          value={formatRs(KPI.todaySales)}
          icon={<Wallet className="h-5 w-5" />}
          tone="primary"
          delta={trend(KPI.todaySales, salesYesterday)}
          hint={trend(KPI.todaySales, salesYesterday) ? undefined : "vs. yesterday"}
        />
        <StatCard
          label="Purchases"
          value={formatRs(purchasesToday)}
          icon={<Truck className="h-5 w-5" />}
          tone="info"
          delta={trend(purchasesToday, purchasesYesterday)}
          hint={trend(purchasesToday, purchasesYesterday) ? undefined : "vs. yesterday"}
        />
        <StatCard
          label="Inventory Value"
          value={formatRs(KPI.inventoryValue, { compact: true })}
          icon={<Boxes className="h-5 w-5" />}
          tone="success"
          hint={`${formatNumber(KPI.totalUnits)} units`}
        />
        <StatCard label="Low Stock" value={String(KPI.lowStock)} icon={<TrendingDown className="h-5 w-5" />} tone="warning" hint="Needs reorder" />
        <StatCard label="Expiring Soon" value={String(KPI.expiringSoon)} icon={<CalendarClock className="h-5 w-5" />} tone="warning" hint="Within 90 days" />
        <StatCard label="Pending Rx" value={String(KPI.pendingPrescriptions)} icon={<FileText className="h-5 w-5" />} tone="danger" hint="Awaiting review" />
      </div>

      {/* Charts row */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales & Purchases" subtitle="Revenue trend over time" />
          <CardBody>
            <SalesChart />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Inventory Overview" subtitle="Stock health distribution" />
          <CardBody>
            <DonutChart data={[...INVENTORY_BREAKDOWN]} />
          </CardBody>
        </Card>
      </div>

      {/* Transactions + alerts */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Transactions"
            subtitle="Latest sales activity"
            action={
              <Link href="/admin/sales" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <DataTable
            columns={columns}
            rows={recentSales}
            empty={
              <EmptyState
                icon={<Receipt className="h-6 w-6" />}
                title="No sales yet"
                description="Completed sales will appear here as your managers ring them up."
              />
            }
          />
        </Card>

        <Card>
          <CardHeader title="Alerts" subtitle="Requires your attention" />
          <CardBody className="space-y-2.5">
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <AlertRow key={index} icon={alert.icon} tone={alert.tone} title={alert.title} href={alert.href} />
              ))
            ) : (
              <AlertRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                tone="success"
                title="All clear — no urgent alerts right now."
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
