"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { SALES } from "@/lib/data";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import type { Sale } from "@/lib/types";

const PER_PAGE = 8;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ManagerSalesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return SALES.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.invoice.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q);
      const matchPayment = !payment || s.payment === payment;
      const matchStatus = !status || s.status === status;
      const matchDate = !date || s.date === date;
      return matchSearch && matchPayment && matchStatus && matchDate;
    });
  }, [search, payment, status, date]);

  const paged = paginate(filtered, page, PER_PAGE);
  const resetPage = () => setPage(1);

  const columns: Column<Sale>[] = [
    {
      key: "invoice",
      header: "Invoice",
      render: (s) => <span className="font-semibold text-navy-900">{s.invoice}</span>,
    },
    { key: "customer", header: "Customer", render: (s) => <span className="text-navy-700">{s.customer}</span> },
    { key: "itemCount", header: "Items", align: "center", hideOnMobile: true, render: (s) => <span className="text-navy-600">{s.itemCount}</span> },
    { key: "total", header: "Total", align: "right", render: (s) => <span className="font-bold text-navy-900">{formatRs(s.total)}</span> },
    { key: "payment", header: "Payment", hideOnMobile: true, render: (s) => <span className="text-navy-600">{capitalize(s.payment)}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (s) => <span className="text-navy-500">{formatDate(s.date)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Browse and search all completed and pending transactions."
        breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "Selling" }, { label: "Sales" }]}
        actions={
          <Link href="/manager/store">
            <Button>
              <Plus className="h-4 w-4" /> New Sale
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by invoice or customer…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:ml-auto lg:flex">
            <Select
              value={payment}
              onChange={(e) => { setPayment(e.target.value); resetPage(); }}
              placeholder="All Payments"
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "bank", label: "Bank" },
                { value: "other", label: "Other" },
              ]}
            />
            <Select
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
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); resetPage(); }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          onRowClick={(s) => router.push(`/manager/sales/${s.id}`)}
          empty={
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No sales found"
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
