"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { PURCHASES } from "@/lib/data";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import type { Purchase } from "@/lib/types";

const PER_PAGE = 8;

export default function PurchasesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);

  const filtered = useMemo(() => {
    return PURCHASES.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.poNumber.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q);
      const matchStatus = !status || p.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Purchase>[] = [
    { key: "poNumber", header: "PO Number", render: (p) => <span className="font-semibold text-navy-900">{p.poNumber}</span> },
    { key: "supplier", header: "Supplier", render: (p) => <span className="text-navy-700">{p.supplier}</span> },
    { key: "itemCount", header: "Items", align: "center", hideOnMobile: true, render: (p) => <span className="text-navy-600">{p.itemCount}</span> },
    { key: "total", header: "Total", align: "right", render: (p) => <span className="font-semibold text-navy-900">{formatRs(p.total)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <Dropdown
          align="right"
          trigger={
            <button
              className="rounded-lg px-2 py-1 text-navy-400 hover:bg-navy-100 hover:text-navy-700"
              aria-label="Actions"
              onClick={(e) => e.stopPropagation()}
            >
              •••
            </button>
          }
          items={[
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/admin/purchases/${p.id}`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Manage purchase orders, suppliers, and incoming stock."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Operations" }, { label: "Purchases" }]}
        actions={
          <Link href="/admin/purchases/create">
            <Button>
              <Plus className="h-4 w-4" /> New Purchase Order
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by PO number or supplier…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto">
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); resetPage(); }}
              placeholder="All Status"
              options={[
                { value: "draft", label: "Draft" },
                { value: "ordered", label: "Ordered" },
                { value: "received", label: "Received" },
                { value: "partial", label: "Partial" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          onRowClick={(p) => router.push(`/admin/purchases/${p.id}`)}
          empty={
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title="No purchase orders found"
              description="Try adjusting your search or filters."
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
