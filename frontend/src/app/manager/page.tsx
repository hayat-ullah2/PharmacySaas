"use client";

import Link from "next/link";
import {
  Wallet,
  ShoppingBag,
  Plus,
  Store,
  FileText,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { useAuth } from "@/lib/auth";
import { SALES } from "@/lib/data";
import { formatRs, formatDate } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function ManagerHome() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const todaysSales = SALES.filter((s) => s.date === today);
  const todaysTotal = todaysSales.reduce((sum, s) => sum + s.total, 0);
  const todaysCount = todaysSales.length;
  const recentSales = [...SALES].slice(0, 6);

  const quickActions = [
    { label: "New Sale", href: "/manager/store", icon: Plus, tone: "bg-primary-600" },
    { label: "Browse Store", href: "/manager/store", icon: Store, tone: "bg-info-600" },
    { label: "Prescriptions", href: "/manager/prescriptions", icon: FileText, tone: "bg-warning-500" },
    { label: "Returns", href: "/manager/returns", icon: RotateCcw, tone: "bg-navy-600" },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">
          {greeting()}, {user?.name.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="mt-1 text-sm text-navy-500">Ready to ring up a sale?</p>
      </div>

      {/* Sales-focused stats only — no business-wide revenue or inventory analytics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Today's Sales" value={formatRs(todaysTotal)} icon={<Wallet className="h-5 w-5" />} tone="primary" hint="Completed today" />
        <StatCard label="Today's Orders" value={String(todaysCount)} icon={<ShoppingBag className="h-5 w-5" />} tone="info" hint="Transactions today" />
      </div>

      {/* Big New Sale CTA + quick actions */}
      <div className="mt-5">
        <Link
          href="/manager/store"
          className="flex items-center gap-4 rounded-[var(--radius-card)] bg-primary-600 p-5 text-white shadow-card transition hover:bg-primary-700"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <Plus className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-lg font-bold">Start a New Sale</p>
            <p className="text-sm text-primary-100">Browse the store, add items to the cart, and check out.</p>
          </div>
          <ArrowRight className="h-5 w-5" />
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className="group flex items-center gap-3 rounded-[var(--radius-card)] border border-navy-200/70 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${a.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-semibold text-navy-800">{a.label}</span>
                <ArrowRight className="h-4 w-4 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent sales */}
      <Card className="mt-5">
        <CardHeader
          title="Recent Sales"
          subtitle="Latest completed transactions"
          action={
            <Link href="/manager/sales" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <CardBody className="space-y-2">
          {recentSales.length === 0 ? (
            <EmptyState title="No sales yet" description="Completed sales will appear here." />
          ) : (
            recentSales.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-navy-100 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 text-xs font-bold">
                  {s.invoice.slice(-3)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">{s.customer}</p>
                  <p className="text-xs text-navy-400">{s.invoice} · {s.itemCount} items · {formatDate(s.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy-900">{formatRs(s.total)}</p>
                  <StatusBadge status={s.status} dot={false} />
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
