"use client";

import { useMemo, useState } from "react";
import { TrendingDown, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { MEDICINES } from "@/lib/data";
import { paginate } from "@/lib/utils";
import type { Medicine } from "@/lib/types";

const PER_PAGE = 8;

const LOW_STOCK = MEDICINES.filter(
  (m) => m.status === "low" || m.status === "out" || m.stock <= m.reorderLevel,
);

export default function LowStockPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LOW_STOCK.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q),
    );
  }, [search]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Medicine>[] = [
    {
      key: "name",
      header: "Medicine",
      render: (m) => (
        <div className="min-w-0">
          <p className="font-medium text-navy-900">{m.name}</p>
          <p className="text-xs text-navy-400">{m.sku} · {m.genericName}</p>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Available",
      align: "center",
      render: (m) => (
        <span className={m.stock === 0 ? "font-semibold text-danger-600" : "font-semibold text-warning-600"}>
          {m.stock}
        </span>
      ),
    },
    {
      key: "reorderLevel",
      header: "Reorder Level",
      align: "center",
      hideOnMobile: true,
      render: (m) => <span className="text-navy-600">{m.reorderLevel}</span>,
    },
    {
      key: "shortfall",
      header: "Shortfall",
      align: "center",
      render: (m) => (
        <span className="font-medium text-navy-800">{Math.max(0, m.reorderLevel - m.stock)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (m) => <StatusBadge status={m.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Low Stock"
        description="Medicines at or below their reorder level — reorder before they run out."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Low Stock" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Low / Out of Stock"
          value={String(LOW_STOCK.length)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="warning"
          hint="Needs reorder"
        />
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search low-stock medicines…"
            className="lg:max-w-xs lg:flex-1"
          />
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<PackageCheck className="h-6 w-6" />}
              title="All stock levels are healthy"
              description="No medicines are currently below their reorder level."
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
