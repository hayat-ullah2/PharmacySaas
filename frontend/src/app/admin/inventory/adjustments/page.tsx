"use client";

import { useMemo, useState } from "react";
import { Plus, SlidersHorizontal, FileClock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { MEDICINES, ADJUSTMENTS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatDate, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { StockAdjustment } from "@/lib/types";

const PER_PAGE = 8;

export default function AdjustmentsPage() {
  const { toast } = useToast();
  const { adjustStock } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medicineId, setMedicineId] = useState("");
  const [type, setType] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const resetPage = () => setPage(1);

  const selectedMedicine = useMemo(() => [...MEDICINES].find((m) => m.id === medicineId), [medicineId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...ADJUSTMENTS]
      .filter((a) => {
        const matchSearch = !q || a.medicineName.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q);
        const kind = a.delta > 0 ? "Added" : a.delta < 0 ? "Removed" : "Correction";
        const matchType = !typeFilter || kind === typeFilter;
        return matchSearch && matchType;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [search, typeFilter]);

  const paged = paginate(filtered, page, PER_PAGE);

  const openNew = () => {
    setMedicineId("");
    setType("add");
    setQuantity("");
    setReason("");
    setOpen(true);
  };

  const save = async () => {
    if (!selectedMedicine) {
      toast({ type: "warning", title: "Medicine required", description: "Choose which medicine to adjust." });
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      toast({ type: "warning", title: "Invalid quantity", description: "Enter a valid quantity." });
      return;
    }
    const current = selectedMedicine.stock;
    const newStock = type === "add" ? current + qty : type === "remove" ? Math.max(0, current - qty) : qty;
    setSaving(true);
    try {
      await adjustStock(selectedMedicine.id, newStock, reason.trim() || "Manual adjustment");
      toast({ type: "success", title: "Adjustment recorded", description: `${selectedMedicine.name} stock set to ${newStock}.` });
      setOpen(false);
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to adjust stock", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<StockAdjustment>[] = [
    { key: "medicineName", header: "Medicine", render: (a) => <span className="font-medium text-navy-900">{a.medicineName}</span> },
    {
      key: "delta",
      header: "Change",
      render: (a) => (
        <Badge tone={a.delta > 0 ? "success" : a.delta < 0 ? "danger" : "info"}>
          {a.delta > 0 ? `+${a.delta}` : a.delta}
        </Badge>
      ),
    },
    { key: "previousStock", header: "Was", align: "center", hideOnMobile: true, render: (a) => <span className="text-navy-500">{a.previousStock}</span> },
    { key: "newStock", header: "Now", align: "center", render: (a) => <span className="font-medium text-navy-800">{a.newStock}</span> },
    { key: "reason", header: "Reason", hideOnMobile: true, render: (a) => <span className="text-navy-600">{a.reason}</span> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (a) => <span className="text-navy-500">{formatDate(a.date)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        description="A full history of manual stock additions, removals, and corrections."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Adjustments" },
        ]}
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New Adjustment
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search medicine or reason…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto">
            <Select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
              placeholder="All Types"
              options={[
                { value: "Added", label: "Added" },
                { value: "Removed", label: "Removed" },
                { value: "Correction", label: "Correction" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<FileClock className="h-6 w-6" />}
              title="No adjustments yet"
              description="Stock additions, removals, and corrections will appear here."
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
        open={open}
        onClose={() => { if (!saving) setOpen(false); }}
        title="New Stock Adjustment"
        description="Add, remove, or set the on-hand quantity for a medicine."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={!medicineId || quantity === ""}>
              <SlidersHorizontal className="h-4 w-4" /> Save Adjustment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Medicine"
            value={medicineId}
            onChange={(e) => setMedicineId(e.target.value)}
            placeholder="Select a medicine"
            options={[...MEDICINES].map((m) => ({ value: m.id, label: `${m.name} ${m.strength}` }))}
          />
          {selectedMedicine && (
            <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-500">
              Current stock: <span className="font-semibold text-navy-800">{selectedMedicine.stock}</span>
            </p>
          )}
          <Select
            label="Adjustment Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: "add", label: "Add to stock" },
              { value: "remove", label: "Remove from stock" },
              { value: "correction", label: "Set exact stock" },
            ]}
          />
          <Input
            label={type === "correction" ? "New stock level" : "Quantity"}
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 25"
          />
          <Textarea
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for this adjustment…"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
