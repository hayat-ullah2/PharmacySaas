"use client";

import { useMemo, useState } from "react";
import { Download, Boxes, Layers, Wallet, TrendingDown, CalendarClock, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { DonutChart } from "@/components/dashboard/Charts";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { MEDICINES, CATEGORIES, INVENTORY_BREAKDOWN, KPI } from "@/lib/data";
import { formatRs, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Medicine } from "@/lib/types";

const PER_PAGE = 8;

export default function InventoryReportPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);

  const stockValue = useMemo(
    () => MEDICINES.reduce((s, m) => s + m.sellingPrice * m.stock, 0),
    [],
  );

  const filtered = useMemo(() => {
    return MEDICINES.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q);
      const matchCat = !category || m.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Medicine>[] = [
    {
      key: "name",
      header: "Medicine",
      render: (m) => (
        <div className="min-w-0">
          <p className="font-medium text-navy-900">{m.name}</p>
          <p className="text-xs text-navy-400">{m.sku}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", hideOnMobile: true, render: (m) => <Badge tone="navy">{m.category}</Badge> },
    {
      key: "stock",
      header: "Stock",
      align: "center",
      render: (m) => (
        <span className={m.stock <= m.reorderLevel ? "font-semibold text-warning-600" : "font-medium text-navy-800"}>
          {m.stock}
        </span>
      ),
    },
    { key: "reorderLevel", header: "Reorder", align: "center", hideOnMobile: true, render: (m) => <span className="text-navy-500">{m.reorderLevel}</span> },
    { key: "sellingPrice", header: "Price", align: "right", render: (m) => <span className="font-semibold text-navy-900">{formatRs(m.sellingPrice)}</span> },
    { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory Report"
        description="Stock health, valuation, and reorder exposure across the catalog."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Reports", href: "/admin/reports" }, { label: "Inventory" }]}
        actions={
          <Button variant="outline" onClick={() => {
            const n = exportToCsv("inventory-report.csv", filtered, [
              { header: "Medicine", value: (m) => m.name },
              { header: "Generic", value: (m) => m.genericName },
              { header: "Category", value: (m) => m.category },
              { header: "SKU", value: (m) => m.sku },
              { header: "Stock", value: (m) => m.stock },
              { header: "Reorder Level", value: (m) => m.reorderLevel },
              { header: "Selling Price", value: (m) => m.sellingPrice },
              { header: "Stock Value", value: (m) => m.sellingPrice * m.stock },
              { header: "Status", value: (m) => m.status },
              { header: "Expiry", value: (m) => m.expiry },
            ]);
            toast(n ? { type: "success", title: "Export ready", description: `${n} item(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No items match the current filters." });
          }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Products" value={String(KPI.totalProducts)} icon={<Boxes className="h-5 w-5" />} tone="primary" />
        <StatCard label="Total Units" value={KPI.totalUnits.toLocaleString("en-US")} icon={<Layers className="h-5 w-5" />} tone="info" />
        <StatCard label="Stock Value" value={formatRs(stockValue, { compact: true })} icon={<Wallet className="h-5 w-5" />} tone="success" />
        <StatCard label="Low Stock" value={String(KPI.lowStock)} icon={<TrendingDown className="h-5 w-5" />} tone="warning" />
        <StatCard label="Expiring" value={String(KPI.expiringSoon)} icon={<CalendarClock className="h-5 w-5" />} tone="danger" />
      </div>

      <Card className="mt-5">
        <CardHeader title="Stock health distribution" subtitle="Products by inventory status" />
        <CardBody>
          <DonutChart data={[...INVENTORY_BREAKDOWN]} />
        </CardBody>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by name, generic, or SKU…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto lg:w-56">
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); resetPage(); }}
              placeholder="All Categories"
              options={CATEGORIES.map((c) => ({ value: c.name, label: c.name }))}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Pill className="h-6 w-6" />}
              title="No products found"
              description="Try adjusting your search or category filter."
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
