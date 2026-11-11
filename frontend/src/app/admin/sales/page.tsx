"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Receipt } from "lucide-react";
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
import { SALES } from "@/lib/data";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Sale } from "@/lib/types";

const PER_PAGE = 8;

export default function SalesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("");
  const [status, setStatus] = useState("");
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
      return matchSearch && matchPayment && matchStatus;
    });
  }, [search, payment, status]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Sale>[] = [
    {
      key: "invoice",
      header: "Invoice",
      render: (s) => <span className="font-semibold text-navy-900">{s.invoice}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (s) => <span className="text-navy-700">{s.customer}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      align: "center",
      hideOnMobile: true,
      render: (s) => <span className="text-navy-600">{s.itemCount}</span>,
    },
    {
      key: "subtotal",
      header: "Subtotal",
      align: "right",
      hideOnMobile: true,
      render: (s) => <span className="text-navy-600">{formatRs(s.subtotal)}</span>,
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      hideOnMobile: true,
      render: (s) => <span className="text-navy-500">{formatRs(s.discount)}</span>,
    },
    {
      key: "tax",
      header: "Tax",
      align: "right",
      hideOnMobile: true,
      render: (s) => <span className="text-navy-500">{formatRs(s.tax)}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (s) => <span className="font-semibold text-navy-900">{formatRs(s.total)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      hideOnMobile: true,
      render: (s) => <span className="capitalize text-navy-600">{s.payment}</span>,
    },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "date",
      header: "Date",
      align: "right",
      hideOnMobile: true,
      render: (s) => <span className="text-navy-500">{formatDate(s.date)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (s) => (
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
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/admin/sales/${s.id}`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Browse invoices, filter by payment and status, and open any sale."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Operations" }, { label: "Sales" }]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                const n = exportToCsv("sales.csv", filtered, [
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
                toast(n ? { type: "success", title: "Export ready", description: `${n} sale(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No sales match the current filters." });
              }}
            >
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
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
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
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
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          onRowClick={(s) => router.push(`/admin/sales/${s.id}`)}
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
