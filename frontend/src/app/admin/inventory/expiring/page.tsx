"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { BATCHES } from "@/lib/data";
import { formatDate, paginate } from "@/lib/utils";
import type { Batch } from "@/lib/types";

const PER_PAGE = 8;

// Prototype reference "today"
const TODAY = new Date("2026-09-26");
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysToExpiry(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - TODAY.getTime()) / MS_PER_DAY);
}

const EXPIRING = BATCHES.filter((b) => b.status === "expiring");

export default function ExpiringPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return EXPIRING.filter(
      (b) =>
        !q ||
        b.medicineName.toLowerCase().includes(q) ||
        b.batchNumber.toLowerCase().includes(q),
    );
  }, [search]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Batch>[] = [
    {
      key: "medicineName",
      header: "Medicine",
      render: (b) => <span className="font-medium text-navy-900">{b.medicineName}</span>,
    },
    {
      key: "batchNumber",
      header: "Batch",
      hideOnMobile: true,
      render: (b) => <span className="text-navy-600">{b.batchNumber}</span>,
    },
    {
      key: "expiryDate",
      header: "Expiry",
      align: "right",
      render: (b) => <span className="text-navy-600">{formatDate(b.expiryDate)}</span>,
    },
    {
      key: "daysLeft",
      header: "Days Left",
      align: "center",
      render: (b) => {
        const d = daysToExpiry(b.expiryDate);
        return (
          <Badge tone={d <= 60 ? "danger" : "warning"}>
            {d > 0 ? `${d} days` : "Due"}
          </Badge>
        );
      },
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "center",
      hideOnMobile: true,
      render: (b) => <span className="font-medium text-navy-800">{b.remaining}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => <StatusBadge status={b.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expiring Soon"
        description="Batches approaching their expiry date — return or clear them in time."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Expiring Soon" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Expiring Batches"
          value={String(EXPIRING.length)}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="warning"
          hint="Within 90 days"
        />
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by medicine or batch…"
            className="lg:max-w-xs lg:flex-1"
          />
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<CalendarCheck className="h-6 w-6" />}
              title="No batches expiring soon"
              description="All batches are within a safe expiry window."
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
