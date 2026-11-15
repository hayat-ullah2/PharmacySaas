"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Layers,
  Clock,
  AlertOctagon,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { StatCard } from "@/components/dashboard/StatCard";
import { BATCHES, MEDICINES, SUPPLIERS } from "@/lib/data";
import { purchasableUnits } from "@/lib/units";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Batch } from "@/lib/types";

const PER_PAGE = 8;

const emptyForm = { medicineId: "", batchNumber: "", supplier: "", unit: "", quantity: "", expiryDate: "", purchasePrice: "", sellingPrice: "" };

export default function BatchesPage() {
  const { toast } = useToast();
  const { addBatch } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Packaging context for the selected medicine, to convert the chosen purchase
  // unit into base units (e.g. 5 Box -> 500 Tablet).
  const selectedMed = useMemo(() => [...MEDICINES].find((m) => m.id === form.medicineId), [form.medicineId]);
  const batchUnits = selectedMed ? purchasableUnits(selectedMed) : [];
  const batchBaseUnit = selectedMed?.unit ?? "unit";
  const batchFactor = batchUnits.find((u) => u.name === form.unit)?.factor ?? 1;

  const submitBatch = async () => {
    const quantity = Number(form.quantity);
    if (!form.medicineId) {
      toast({ type: "warning", title: "Medicine required", description: "Choose which medicine this batch is for." });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({ type: "warning", title: "Invalid quantity", description: "Enter a quantity greater than zero." });
      return;
    }
    if (!form.expiryDate) {
      toast({ type: "warning", title: "Expiry required", description: "Enter the batch expiry date." });
      return;
    }
    setSaving(true);
    try {
      await addBatch({
        medicineId: form.medicineId,
        batchNumber: form.batchNumber.trim(),
        supplier: form.supplier || undefined,
        unit: form.unit || undefined,
        quantity,
        expiryDate: form.expiryDate,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
      });
      toast({ type: "success", title: "Batch added", description: `${quantity} ${form.unit || "unit"}(s) added — ${quantity * batchFactor} ${batchBaseUnit} in stock.` });
      setAddOpen(false);
      setForm(emptyForm);
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to add batch", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(
    () => ({
      total: BATCHES.length,
      expiring: BATCHES.filter((b) => b.status === "expiring").length,
      expired: BATCHES.filter((b) => b.status === "expired").length,
      healthy: BATCHES.filter((b) => b.status === "healthy").length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return BATCHES.filter((b) => {
      const matchSearch =
        !q ||
        b.medicineName.toLowerCase().includes(q) ||
        b.batchNumber.toLowerCase().includes(q);
      const matchStatus = !status || b.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Batch>[] = [
    {
      key: "medicineName",
      header: "Medicine",
      render: (b) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Layers className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <span className="font-medium text-navy-900">{b.medicineName}</span>
            {b.supplier ? <span className="block text-[10px] text-navy-400">{b.supplier}</span> : null}
          </div>
        </div>
      ),
    },
    {
      key: "batchNumber",
      header: "Batch No.",
      render: (b) => (
        <span className="font-mono text-xs text-navy-600">{b.batchNumber}</span>
      ),
    },
    {
      key: "purchaseDate",
      header: "Purchased",
      hideOnMobile: true,
      render: (b) => (
        <span className="text-navy-500">{formatDate(b.purchaseDate)}</span>
      ),
    },
    {
      key: "expiryDate",
      header: "Expiry",
      hideOnMobile: true,
      render: (b) => (
        <span className="text-navy-500">{formatDate(b.expiryDate)}</span>
      ),
    },
    {
      key: "purchasePrice",
      header: "Purchase",
      align: "right",
      hideOnMobile: true,
      render: (b) => (
        <span className="text-navy-600">{formatRs(b.purchasePrice)}</span>
      ),
    },
    {
      key: "sellingPrice",
      header: "Selling",
      align: "right",
      render: (b) => (
        <span className="font-semibold text-navy-900">
          {formatRs(b.sellingPrice)}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      align: "center",
      hideOnMobile: true,
      render: (b) => (
        <span className="text-navy-600">
          {b.quantity}
          {b.purchaseUnit && b.purchaseQty && b.purchaseQty !== b.quantity ? (
            <span className="block text-[10px] text-navy-400">{b.purchaseQty} {b.purchaseUnit}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "center",
      render: (b) => (
        <span className="font-medium text-navy-800">
          {b.remaining}
          <span className="text-navy-400">/{b.quantity}</span>
        </span>
      ),
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
        title="Batch Management"
        description="Track purchase batches, pricing, and expiry across your inventory."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Inventory" },
          { label: "Batches" },
        ]}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Batch
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Batches"
          value={String(counts.total)}
          icon={<Boxes className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Healthy"
          value={String(counts.healthy)}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Expiring Soon"
          value={String(counts.expiring)}
          icon={<Clock className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Expired"
          value={String(counts.expired)}
          icon={<AlertOctagon className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by medicine or batch number…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              placeholder="All Status"
              options={[
                { value: "healthy", label: "Healthy" },
                { value: "expiring", label: "Expiring" },
                { value: "expired", label: "Expired" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title="No batches found"
              description="Try adjusting your search or filters."
            />
          }
        />

        {filtered.length > 0 && (
          <div className="border-t border-navy-100 px-4 py-2">
            <Pagination
              page={page}
              totalItems={filtered.length}
              perPage={PER_PAGE}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      <Modal
        open={addOpen}
        onClose={() => { if (!saving) { setAddOpen(false); setForm(emptyForm); } }}
        title="Add Batch"
        description="Restock a medicine. This adds the quantity to the medicine's stock."
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddOpen(false); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button onClick={submitBatch} loading={saving} disabled={!form.medicineId || !form.quantity || !form.expiryDate}>Add Batch</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Medicine"
            value={form.medicineId}
            onChange={(e) => {
              const med = [...MEDICINES].find((m) => m.id === e.target.value);
              setForm((f) => ({ ...f, medicineId: e.target.value, unit: med?.unit ?? "" }));
            }}
            placeholder="Select a medicine"
            options={[...MEDICINES].filter((m) => !m.archived).map((m) => ({ value: m.id, label: `${m.name} ${m.strength}` }))}
          />
          <Select
            label="Supplier (optional)"
            value={form.supplier}
            onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
            placeholder="Select supplier"
            options={SUPPLIERS.map((s) => ({ value: s.name, label: s.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Purchase Unit"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="Unit"
              disabled={!selectedMed}
              options={batchUnits.map((u) => ({ value: u.name, label: u.factor > 1 ? `${u.name} (${u.factor} ${batchBaseUnit})` : u.name }))}
            />
            <Input label={`Quantity (${form.unit || batchBaseUnit})`} type="number" min={1} placeholder="e.g. 5" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          </div>
          {batchFactor > 1 && Number(form.quantity) > 0 ? (
            <p className="-mt-2 text-xs text-primary-600">
              Adds <span className="font-semibold">{Number(form.quantity) * batchFactor} {batchBaseUnit}</span> to stock.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Expiry date" type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
            <Input label="Batch number (optional)" placeholder="Auto if blank" value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Purchase price / ${form.unit || batchBaseUnit}`} type="number" min={0} step="0.01" placeholder="Medicine default" value={form.purchasePrice} onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))} />
            <Input label={`Selling price / ${batchBaseUnit}`} type="number" min={0} step="0.01" placeholder="Medicine default" value={form.sellingPrice} onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
