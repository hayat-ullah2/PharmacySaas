"use client";

import { useMemo, useState } from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { BATCHES, MEDICINES } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatDate, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Batch } from "@/lib/types";

const PER_PAGE = 8;

export default function ExpiredPage() {
  const { toast } = useToast();
  const { adjustStock } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [disposing, setDisposing] = useState(false);
  const [disposeTarget, setDisposeTarget] = useState<Batch | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...BATCHES].filter(
      (b) =>
        b.status === "expired" &&
        (!q ||
          b.medicineName.toLowerCase().includes(q) ||
          b.batchNumber.toLowerCase().includes(q)),
    );
  }, [search]);

  const expiredCount = useMemo(() => [...BATCHES].filter((b) => b.status === "expired").length, []);

  const paged = paginate(filtered, page, PER_PAGE);

  const confirmDispose = async () => {
    if (!disposeTarget) return;
    const med = [...MEDICINES].find((m) => m.id === disposeTarget.medicineId);
    if (!med) {
      toast({ type: "warning", title: "Medicine not found", description: "Its medicine record may have been removed." });
      setDisposeTarget(null);
      return;
    }
    setDisposing(true);
    try {
      const newStock = Math.max(0, med.stock - disposeTarget.remaining);
      await adjustStock(med.id, newStock, `Disposed expired batch ${disposeTarget.batchNumber}`);
      toast({ type: "success", title: "Batch disposed", description: `${disposeTarget.remaining} expired unit(s) removed from stock.` });
      setDisposeTarget(null);
    } catch (disposeError) {
      toast({ type: "danger", title: "Unable to dispose batch", description: disposeError instanceof Error ? disposeError.message : "Please try again." });
    } finally {
      setDisposing(false);
    }
  };

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
      render: (b) => <span className="font-medium text-danger-600">{formatDate(b.expiryDate)}</span>,
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "center",
      hideOnMobile: true,
      render: (b) => <span className="text-navy-600">{b.remaining}</span>,
    },
    {
      key: "quantity",
      header: "Batch Qty",
      align: "center",
      hideOnMobile: true,
      render: (b) => <span className="text-navy-600">{b.quantity}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
        <Button
          size="sm"
          variant="danger"
          onClick={(e) => { e.stopPropagation(); setDisposeTarget(b); }}
        >
          <Trash2 className="h-4 w-4" /> Dispose
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expired Stock"
        description="Expired batches that must be removed from sellable inventory and disposed of."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Expired" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Expired Batches"
          value={String(expiredCount)}
          icon={<Trash2 className="h-5 w-5" />}
          tone="danger"
          hint="Dispose required"
        />
      </div>

      <Card className="mt-5 border-danger-200/70">
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
              icon={<ShieldCheck className="h-6 w-6" />}
              title="No expired stock"
              description="There are no expired batches to dispose of right now."
            />
          }
        />

        {filtered.length > 0 && (
          <div className="border-t border-navy-100 px-4 py-2">
            <Pagination page={page} totalItems={filtered.length} perPage={PER_PAGE} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={!!disposeTarget}
        onClose={() => setDisposeTarget(null)}
        title="Dispose expired batch"
        description={`Confirm disposal of batch ${disposeTarget?.batchNumber ?? ""}. This action cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDisposeTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDispose} loading={disposing}>Dispose</Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <Trash2 className="h-5 w-5 shrink-0" />
          Disposing removes {disposeTarget?.medicineName} (batch {disposeTarget?.batchNumber}) permanently from inventory records.
        </div>
      </Modal>
    </div>
  );
}
