"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Layers,
  TrendingDown,
  CalendarClock,
  Trash2,
  Wallet,
  SlidersHorizontal,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { MEDICINES, BATCHES, KPI } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, formatNumber, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Medicine } from "@/lib/types";

const PER_PAGE = 8;

export default function InventoryPage() {
  const { toast } = useToast();
  const { adjustStock } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // Stock adjustment modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjMedicine, setAdjMedicine] = useState("");
  const [adjType, setAdjType] = useState("add");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const resetPage = () => setPage(1);

  const filtered = useMemo(() => {
    return MEDICINES.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q);
      const matchStatus = !status || m.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  const paged = paginate(filtered, page, PER_PAGE);

  const openAdjust = (medicineId?: string) => {
    setAdjMedicine(medicineId ?? "");
    setAdjType("add");
    setAdjQty("");
    setAdjReason("");
    setAdjustOpen(true);
  };

  const saveAdjustment = async () => {
    const med = [...MEDICINES].find((m) => m.id === adjMedicine);
    if (!med) {
      toast({ type: "warning", title: "Medicine required", description: "Choose which medicine to adjust." });
      return;
    }
    const qty = Number(adjQty);
    if (!Number.isFinite(qty) || qty < 0) {
      toast({ type: "warning", title: "Invalid quantity", description: "Enter a valid quantity." });
      return;
    }
    const newStock = adjType === "add" ? med.stock + qty : adjType === "remove" ? Math.max(0, med.stock - qty) : qty;
    setSaving(true);
    try {
      await adjustStock(med.id, newStock, adjReason.trim() || "Manual adjustment");
      toast({ type: "success", title: "Stock adjusted", description: `${med.name} stock set to ${newStock}.` });
      setAdjustOpen(false);
    } catch (adjustError) {
      toast({ type: "danger", title: "Unable to adjust stock", description: adjustError instanceof Error ? adjustError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Medicine>[] = [
    {
      key: "name",
      header: "Medicine",
      render: (m) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Package className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-navy-900">{m.name}</p>
            <p className="text-xs text-navy-400">{m.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "batch",
      header: "Batch",
      hideOnMobile: true,
      render: (m) => {
        const batch = BATCHES.find((b) => b.medicineId === m.id);
        return <span className="text-navy-600">{batch?.batchNumber ?? m.sku}</span>;
      },
    },
    {
      key: "available",
      header: "Available",
      align: "center",
      render: (m) => (
        <span className={m.stock <= m.reorderLevel ? "font-semibold text-warning-600" : "font-medium text-navy-800"}>
          {m.stock}
        </span>
      ),
    },
    {
      key: "reserved",
      header: "Reserved",
      align: "center",
      hideOnMobile: true,
      render: (m) => <span className="text-navy-500">{Math.round(m.stock * 0.05)}</span>,
    },
    {
      key: "reorderLevel",
      header: "Reorder Level",
      align: "center",
      hideOnMobile: true,
      render: (m) => <span className="text-navy-500">{m.reorderLevel}</span>,
    },
    {
      key: "expiry",
      header: "Expiry",
      align: "right",
      hideOnMobile: true,
      render: (m) => <span className="text-navy-500">{formatDate(m.expiry)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (m) => <StatusBadge status={m.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) => (
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
            { label: "Adjust Stock", icon: <SlidersHorizontal className="h-4 w-4" />, onClick: () => openAdjust(m.id) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Monitor stock levels, batches, and inventory health across your pharmacy."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Inventory" }]}
        actions={
          <Button onClick={() => openAdjust()}>
            <SlidersHorizontal className="h-4 w-4" /> Adjust Stock
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Products" value={String(KPI.totalProducts)} icon={<Boxes className="h-5 w-5" />} tone="primary" />
        <StatCard label="Total Units" value={formatNumber(KPI.totalUnits)} icon={<Layers className="h-5 w-5" />} tone="info" />
        <StatCard label="Low Stock" value={String(KPI.lowStock)} icon={<TrendingDown className="h-5 w-5" />} tone="warning" hint="Needs reorder" />
        <StatCard label="Expiring Soon" value={String(KPI.expiringSoon)} icon={<CalendarClock className="h-5 w-5" />} tone="warning" hint="Within 90 days" />
        <StatCard label="Expired" value={String(KPI.expired)} icon={<Trash2 className="h-5 w-5" />} tone="danger" hint="Remove soon" />
        <StatCard label="Stock Value" value={formatRs(KPI.inventoryValue, { compact: true })} icon={<Wallet className="h-5 w-5" />} tone="success" />
      </div>

      <Card className="mt-5">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by name, generic, or SKU…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto">
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); resetPage(); }}
              placeholder="All Status"
              options={[
                { value: "healthy", label: "Healthy" },
                { value: "low", label: "Low Stock" },
                { value: "expiring", label: "Expiring" },
                { value: "out", label: "Out of Stock" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="No stock lines found"
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

      {/* Stock Adjustment modal */}
      <Modal
        open={adjustOpen}
        onClose={() => { if (!saving) setAdjustOpen(false); }}
        title="Adjust Stock"
        description="Add, remove, or set the on-hand quantity for a medicine."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveAdjustment} loading={saving} disabled={!adjMedicine || adjQty === ""}>Save Adjustment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Medicine"
            value={adjMedicine}
            onChange={(e) => setAdjMedicine(e.target.value)}
            placeholder="Select a medicine"
            options={[...MEDICINES].map((m) => ({ value: m.id, label: `${m.name} ${m.strength}` }))}
          />
          <Select
            label="Adjustment Type"
            value={adjType}
            onChange={(e) => setAdjType(e.target.value)}
            options={[
              { value: "add", label: "Add to stock" },
              { value: "remove", label: "Remove from stock" },
              { value: "correction", label: "Set exact stock" },
            ]}
          />
          <Input
            label={adjType === "correction" ? "New stock level" : "Quantity"}
            type="number"
            min={0}
            value={adjQty}
            onChange={(e) => setAdjQty(e.target.value)}
            placeholder="e.g. 25"
          />
          <Textarea
            label="Reason"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            placeholder="Reason for this adjustment…"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
