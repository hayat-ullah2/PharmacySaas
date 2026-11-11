"use client";

import { useMemo, useState } from "react";
import { Download, Wallet, ShoppingBag, Sigma, Package, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { CategoryBarChart } from "@/components/dashboard/Charts";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { SALES, CATEGORY_SALES } from "@/lib/data";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Sale } from "@/lib/types";

const PER_PAGE = 8;

export default function SalesReportPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);

  const filtered = useMemo(() => {
    return SALES.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.invoice.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q);
      const matchPayment = !payment || s.payment === payment;
      const matchStatus = !status || s.status === status;
      const matchFrom = !from || s.date >= from;
      const matchTo = !to || s.date <= to;
      return matchSearch && matchPayment && matchStatus && matchFrom && matchTo;
    });
  }, [search, payment, status, from, to]);

  // All figures reflect the filtered period, computed from live sales.
  const summary = useMemo(() => {
    const totalSales = filtered.reduce((s, x) => s + x.total, 0);
    const orders = filtered.length;
    const aov = orders ? Math.round(totalSales / orders) : 0;
    const itemsSold = filtered.reduce((s, x) => s + x.itemCount, 0);
    return { totalSales, orders, aov, itemsSold };
  }, [filtered]);

  const exportSales = () => {
    const count = exportToCsv("sales-report.csv", filtered, [
      { header: "Invoice", value: (s) => s.invoice },
      { header: "Customer", value: (s) => s.customer },
      { header: "Items", value: (s) => s.itemCount },
      { header: "Subtotal", value: (s) => s.subtotal },
      { header: "Discount", value: (s) => s.discount },
      { header: "Tax", value: (s) => s.tax },
      { header: "Total", value: (s) => s.total },
      { header: "Payment", value: (s) => s.payment },
      { header: "Status", value: (s) => s.status },
      { header: "Date", value: (s) => s.date },
    ]);
    toast(count
      ? { type: "success", title: "Export ready", description: `${count} sale(s) downloaded as CSV.` }
      : { type: "info", title: "Nothing to export", description: "No sales match the current filters." });
  };

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Sale>[] = [
    { key: "invoice", header: "Invoice", render: (s) => <span className="font-semibold text-navy-900">{s.invoice}</span> },
    { key: "customer", header: "Customer", render: (s) => <span className="text-navy-700">{s.customer}</span> },
    { key: "total", header: "Total", align: "right", render: (s) => <span className="font-semibold text-navy-900">{formatRs(s.total)}</span> },
    { key: "payment", header: "Payment", hideOnMobile: true, render: (s) => <span className="capitalize text-navy-600">{s.payment}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (s) => <span className="text-navy-500">{formatDate(s.date)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Report"
        description="Revenue performance, top-selling categories, and invoice detail."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Reports", href: "/admin/reports" }, { label: "Sales" }]}
        actions={
          <Button variant="outline" onClick={exportSales}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      {/* Filter bar */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Date from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }} />
            <Input label="Date to" type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }} />
            <Select
              label="Status"
              value={status}
              onChange={(e) => { setStatus(e.target.value); resetPage(); }}
              placeholder="All Status"
              options={[
                { value: "paid", label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "partial", label: "Partial" },
                { value: "refunded", label: "Refunded" },
              ]}
            />
            <Select
              label="Payment method"
              value={payment}
              onChange={(e) => { setPayment(e.target.value); resetPage(); }}
              placeholder="All Methods"
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "bank", label: "Bank" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Sales" value={formatRs(summary.totalSales)} icon={<Wallet className="h-5 w-5" />} tone="primary" hint="Filtered period" />
        <StatCard label="Orders" value={String(summary.orders)} icon={<ShoppingBag className="h-5 w-5" />} tone="info" hint="Invoices in range" />
        <StatCard label="Avg Order Value" value={formatRs(summary.aov)} icon={<Sigma className="h-5 w-5" />} tone="navy" hint="Per invoice" />
        <StatCard label="Items Sold" value={String(summary.itemsSold)} icon={<Package className="h-5 w-5" />} tone="success" hint="Units dispensed" />
      </div>

      {/* Charts */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales trend" subtitle="Revenue over time" />
          <CardBody>
            <SalesChart showPurchases={false} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales by category" subtitle="Share of revenue" />
          <CardBody>
            <CategoryBarChart data={[...CATEGORY_SALES]} />
          </CardBody>
        </Card>
      </div>

      {/* Detail table */}
      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by invoice or customer…"
            className="lg:max-w-xs lg:flex-1"
          />
          <p className="text-sm text-navy-500 lg:ml-auto">{filtered.length} invoices</p>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No sales found"
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
