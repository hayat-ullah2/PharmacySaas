"use client";

import { useMemo, useState } from "react";
import { Download, CalendarClock, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { BATCHES } from "@/lib/data";
import { formatRs, formatDate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Batch } from "@/lib/types";

export default function ExpiryReportPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  // Base set: only at-risk batches, sorted by soonest expiry first.
  const atRisk = useMemo(
    () =>
      BATCHES.filter((b) => b.status === "expiring" || b.status === "expired").sort(
        (a, b) => a.expiryDate.localeCompare(b.expiryDate),
      ),
    [],
  );

  const counts = useMemo(() => {
    const expiring = atRisk.filter((b) => b.status === "expiring").length;
    const expired = atRisk.filter((b) => b.status === "expired").length;
    const valueAtRisk = atRisk.reduce((s, b) => s + b.remaining * b.sellingPrice, 0);
    return { expiring, expired, valueAtRisk, all: atRisk.length };
  }, [atRisk]);

  const filtered = useMemo(() => {
    return atRisk.filter((b) => {
      const matchTab = tab === "all" || b.status === tab;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        b.medicineName.toLowerCase().includes(q) ||
        b.batchNumber.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [atRisk, tab, search]);

  const columns: Column<Batch>[] = [
    { key: "medicineName", header: "Medicine", render: (b) => <span className="font-medium text-navy-900">{b.medicineName}</span> },
    { key: "batchNumber", header: "Batch", render: (b) => <span className="text-navy-600">{b.batchNumber}</span> },
    { key: "expiryDate", header: "Expiry", align: "right", render: (b) => <span className="font-medium text-navy-800">{formatDate(b.expiryDate)}</span> },
    { key: "remaining", header: "Remaining", align: "center", hideOnMobile: true, render: (b) => <span className="text-navy-600">{b.remaining}</span> },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Expiry Report"
        description="Batches expiring soon or already expired, with value at risk."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Reports", href: "/admin/reports" }, { label: "Expiry" }]}
        actions={
          <Button variant="outline" onClick={() => {
            const n = exportToCsv("expiry-report.csv", filtered, [
              { header: "Medicine", value: (b) => b.medicineName },
              { header: "Batch", value: (b) => b.batchNumber },
              { header: "Expiry", value: (b) => b.expiryDate },
              { header: "Remaining", value: (b) => b.remaining },
              { header: "Purchase Price", value: (b) => b.purchasePrice },
              { header: "Status", value: (b) => b.status },
            ]);
            toast(n ? { type: "success", title: "Export ready", description: `${n} batch(es) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No batches match the current filters." });
          }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Expiring Soon" value={String(counts.expiring)} icon={<CalendarClock className="h-5 w-5" />} tone="warning" hint="Batches nearing expiry" />
        <StatCard label="Expired" value={String(counts.expired)} icon={<Trash2 className="h-5 w-5" />} tone="danger" hint="Remove from shelves" />
        <StatCard label="Value at Risk" value={formatRs(counts.valueAtRisk)} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" hint="Remaining stock value" />
      </div>

      <Card className="mt-5">
        <div className="px-4 pt-2">
          <Tabs
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "expiring", label: "Expiring", count: counts.expiring },
              { value: "expired", label: "Expired", count: counts.expired },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by medicine or batch…"
            className="lg:max-w-xs lg:flex-1"
          />
          <p className="text-sm text-navy-500 lg:ml-auto">{filtered.length} batches</p>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          empty={
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title="No batches found"
              description="Nothing matches this filter."
            />
          }
        />
      </Card>
    </div>
  );
}
