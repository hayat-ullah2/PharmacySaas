"use client";

import { useMemo, useState } from "react";
import { Download, Truck, ClipboardList, PackageCheck, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendBarChart } from "@/components/dashboard/Charts";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { PURCHASES, SUPPLIERS } from "@/lib/data";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Purchase } from "@/lib/types";

const PER_PAGE = 8;

export default function PurchaseReportPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);

  const summary = useMemo(() => {
    const totalPurchases = PURCHASES.reduce((s, p) => s + p.total, 0);
    const received = PURCHASES.filter((p) => p.status === "received").length;
    return { totalPurchases, count: PURCHASES.length, received };
  }, []);

  const bySupplier = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of PURCHASES) {
      const short = p.supplier.split(" ")[0];
      map.set(short, (map.get(short) ?? 0) + p.total);
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const filtered = useMemo(() => {
    return PURCHASES.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.poNumber.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q);
      const matchSupplier = !supplier || p.supplier === supplier;
      const matchFrom = !from || p.date >= from;
      const matchTo = !to || p.date <= to;
      return matchSearch && matchSupplier && matchFrom && matchTo;
    });
  }, [search, supplier, from, to]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Purchase>[] = [
    { key: "poNumber", header: "PO Number", render: (p) => <span className="font-semibold text-navy-900">{p.poNumber}</span> },
    { key: "supplier", header: "Supplier", render: (p) => <span className="text-navy-700">{p.supplier}</span> },
    { key: "itemCount", header: "Items", align: "center", hideOnMobile: true, render: (p) => <span className="text-navy-600">{p.itemCount}</span> },
    { key: "total", header: "Total", align: "right", render: (p) => <span className="font-semibold text-navy-900">{formatRs(p.total)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span> },
    { key: "expectedDate", header: "Expected", align: "right", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.expectedDate)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Report"
        description="Procurement spend, supplier breakdown, and order status."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Reports", href: "/admin/reports" }, { label: "Purchases" }]}
        actions={
          <Button variant="outline" onClick={() => {
            const n = exportToCsv("purchase-report.csv", filtered, [
              { header: "PO Number", value: (p) => p.poNumber },
              { header: "Supplier", value: (p) => p.supplier },
              { header: "Items", value: (p) => p.itemCount },
              { header: "Total", value: (p) => p.total },
              { header: "Status", value: (p) => p.status },
              { header: "Date", value: (p) => p.date },
              { header: "Expected", value: (p) => p.expectedDate },
            ]);
            toast(n ? { type: "success", title: "Export ready", description: `${n} order(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No orders match the current filters." });
          }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      {/* Filter bar */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Date from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }} />
            <Input label="Date to" type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }} />
            <Select
              label="Supplier"
              value={supplier}
              onChange={(e) => { setSupplier(e.target.value); resetPage(); }}
              placeholder="All Suppliers"
              options={SUPPLIERS.map((s) => ({ value: s.name, label: s.name }))}
            />
          </div>
        </CardBody>
      </Card>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Purchases" value={formatRs(summary.totalPurchases)} icon={<ShoppingCart className="h-5 w-5" />} tone="primary" hint="Across all POs" />
        <StatCard label="Purchase Orders" value={String(summary.count)} icon={<ClipboardList className="h-5 w-5" />} tone="info" hint="Raised this period" />
        <StatCard label="Received" value={String(summary.received)} icon={<PackageCheck className="h-5 w-5" />} tone="success" hint="Fully delivered" />
      </div>

      {/* Chart */}
      <Card className="mt-5">
        <CardHeader title="Spend by supplier" subtitle="Total purchase value per supplier" />
        <CardBody>
          <TrendBarChart data={bySupplier} color="#3b82f6" />
        </CardBody>
      </Card>

      {/* Detail table */}
      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by PO number or supplier…"
            className="lg:max-w-xs lg:flex-1"
          />
          <p className="text-sm text-navy-500 lg:ml-auto">{filtered.length} orders</p>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title="No purchases found"
              description="Try adjusting your filters or date range."
            />
          }
        />

        {filtered.length > 0 && (
          <div className="border-t border-navy-100 px-4 py-2">
            <Pagination page={page} totalItems={filtered.length} perPage={PER_PAGE} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
