"use client";

import { useMemo } from "react";
import { Wallet, ArrowDownToLine, HandCoins, Users, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { SALES, CASH_LEDGER, USERS } from "@/lib/data";
import { formatRs, formatDate } from "@/lib/utils";
import type { CashLedgerEntry } from "@/lib/types";

interface CashierRow {
  id: string;
  name: string;
  collected: number;
  deposited: number;
  inHand: number;
}

export default function OwnerLedgerPage() {
  // Per-cashier reconciliation: cash collected (their cash sales) vs deposited.
  const rows = useMemo<CashierRow[]>(() => {
    const names = new Map<string, string>();
    USERS.filter((u) => u.role === "manager").forEach((u) => names.set(u.id, u.name));

    const collected = new Map<string, number>();
    for (const s of SALES) {
      if (!s.cashierId || s.payment !== "cash") continue;
      collected.set(s.cashierId, (collected.get(s.cashierId) ?? 0) + (s.amountPaid ?? s.total));
      if (s.cashierName && !names.has(s.cashierId)) names.set(s.cashierId, s.cashierName);
    }
    const deposited = new Map<string, number>();
    for (const e of CASH_LEDGER) {
      deposited.set(e.cashierId, (deposited.get(e.cashierId) ?? 0) + e.amount);
      if (e.cashierName && !names.has(e.cashierId)) names.set(e.cashierId, e.cashierName);
    }

    const ids = new Set<string>([...names.keys(), ...collected.keys(), ...deposited.keys()]);
    return [...ids]
      .map((id) => {
        const c = collected.get(id) ?? 0;
        const d = deposited.get(id) ?? 0;
        return { id, name: names.get(id) ?? "Unknown cashier", collected: c, deposited: d, inHand: c - d };
      })
      .filter((r) => r.collected > 0 || r.deposited > 0)
      .sort((a, b) => b.inHand - a.inHand);
  }, []);

  const totals = useMemo(() => ({
    collected: rows.reduce((s, r) => s + r.collected, 0),
    deposited: rows.reduce((s, r) => s + r.deposited, 0),
    inHand: rows.reduce((s, r) => s + r.inHand, 0),
  }), [rows]);

  const deposits = useMemo(
    () => [...CASH_LEDGER].sort((a, b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date)),
    [],
  );

  const cashierCols: Column<CashierRow>[] = [
    { key: "name", header: "Cashier", render: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
    { key: "collected", header: "Cash Collected", align: "right", render: (r) => <span className="text-navy-700">{formatRs(r.collected)}</span> },
    { key: "deposited", header: "Deposited", align: "right", render: (r) => <span className="text-navy-700">{formatRs(r.deposited)}</span> },
    { key: "inHand", header: "In Hand", align: "right", render: (r) => <span className={r.inHand > 0 ? "font-semibold text-warning-600" : "font-semibold text-navy-900"}>{formatRs(r.inHand)}</span> },
  ];

  const depositCols: Column<CashLedgerEntry>[] = [
    { key: "date", header: "Date", render: (e) => <span className="text-navy-600">{formatDate(e.date)}</span> },
    { key: "cashierName", header: "Cashier", render: (e) => <span className="text-navy-700">{e.cashierName}</span> },
    { key: "amount", header: "Amount", align: "right", render: (e) => <span className="font-semibold text-navy-900">{formatRs(e.amount)}</span> },
    { key: "note", header: "Note", hideOnMobile: true, render: (e) => <span className="text-navy-500">{e.note || "—"}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Cash Ledger"
        description="Reconcile cash collected vs deposited by each cashier."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Finance" }, { label: "Cash Ledger" }]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Collected (cash)" value={formatRs(totals.collected)} icon={<Wallet className="h-5 w-5" />} tone="primary" hint="All cashiers" />
        <StatCard label="Deposited" value={formatRs(totals.deposited)} icon={<ArrowDownToLine className="h-5 w-5" />} tone="success" hint="Handed over" />
        <StatCard label="Outstanding in drawers" value={formatRs(totals.inHand)} icon={<HandCoins className="h-5 w-5" />} tone={totals.inHand > 0 ? "warning" : "navy"} hint="Collected − deposited" />
      </div>

      <Card className="mt-5">
        <CardHeader title="By cashier" subtitle={`${rows.length} cashier(s)`} />
        <DataTable
          columns={cashierCols}
          rows={rows}
          empty={<EmptyState icon={<Users className="h-6 w-6" />} title="No cashier activity" description="Cash sales and deposits by managers will appear here." />}
        />
      </Card>

      <Card className="mt-5">
        <CardHeader title="All deposits" subtitle={`${deposits.length} hand-over(s)`} />
        <DataTable
          columns={depositCols}
          rows={deposits}
          empty={<EmptyState icon={<ScrollText className="h-6 w-6" />} title="No deposits yet" description="When a cashier hands over cash, it appears here." />}
        />
      </Card>
    </div>
  );
}
