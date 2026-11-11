"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Download, Eye, Pencil, Trash2, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { MEDICINES, CATEGORIES, BRANDS, MANUFACTURERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Medicine } from "@/lib/types";

const PER_PAGE = 8;

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Softgel", "Inhaler", "Cream", "Drops", "Liquid", "Injection"];
const UNITS = ["Tablet", "Capsule", "Bottle", "Tube", "Softgel", "Inhaler", "Strip", "Box"];

export default function MedicinesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { deleteRecord, saveRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const updEdit = (patch: Partial<Medicine>) => setEditTarget((cur) => (cur ? { ...cur, ...patch } : cur));

  const saveMedicineEdit = async () => {
    if (!editTarget) return;
    const trimmedName = editTarget.name.trim();
    const strength = (editTarget.strength ?? "").trim();
    if (trimmedName.length < 2) {
      toast({ type: "warning", title: "Name required", description: "Enter a medicine name (at least 2 characters)." });
      return;
    }
    if (!(editTarget.sellingPrice > 0)) {
      toast({ type: "warning", title: "Invalid price", description: "Selling price must be greater than 0." });
      return;
    }
    if (editTarget.purchasePrice < 0 || editTarget.reorderLevel < 0) {
      toast({ type: "warning", title: "Invalid value", description: "Purchase price and reorder level cannot be negative." });
      return;
    }
    const duplicate = MEDICINES.some(
      (m) =>
        m.id !== editTarget.id &&
        m.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (m.strength ?? "").trim().toLowerCase() === strength.toLowerCase(),
    );
    if (duplicate) {
      toast({ type: "warning", title: "Already exists", description: `A medicine named "${[trimmedName, strength].filter(Boolean).join(" ")}" already exists.` });
      return;
    }
    setSavingEdit(true);
    try {
      // Preserve stock, expiry, and status — those are managed via batches / stock adjustments.
      await saveRecord("medicines", {
        ...editTarget,
        name: trimmedName,
        genericName: editTarget.genericName.trim(),
        strength,
        sku: (editTarget.sku ?? "").trim(),
        description: (editTarget.description ?? "").trim(),
      });
      toast({ type: "success", title: "Medicine updated", description: `${trimmedName} saved.` });
      setEditTarget(null);
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to update medicine", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = useMemo(() => {
    return MEDICINES.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q);
      const matchCat = !category || m.category === category;
      const matchBrand = !brand || m.brand === brand;
      const matchStatus = !status || m.status === status;
      return matchSearch && matchCat && matchBrand && matchStatus;
    });
  }, [search, category, brand, status]);

  const paged = paginate(filtered, page, PER_PAGE);

  const resetPage = () => setPage(1);

  const columns: Column<Medicine>[] = [
    {
      key: "name",
      header: "Medicine",
      render: (m) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Pill className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-navy-900">{m.name}</p>
            <p className="text-xs text-navy-400">{m.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "genericName", header: "Generic", hideOnMobile: true, render: (m) => <span className="text-navy-600">{m.genericName}</span> },
    { key: "category", header: "Category", hideOnMobile: true, render: (m) => <Badge tone="navy">{m.category}</Badge> },
    { key: "brand", header: "Brand", hideOnMobile: true },
    { key: "strength", header: "Strength", align: "center", render: (m) => <span className="text-navy-600">{m.strength}</span> },
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
    { key: "sellingPrice", header: "Price", align: "right", render: (m) => <span className="font-semibold text-navy-900">{formatRs(m.sellingPrice)}</span> },
    { key: "expiry", header: "Expiry", align: "right", hideOnMobile: true, render: (m) => <span className="text-navy-500">{formatDate(m.expiry)}</span> },
    { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status} /> },
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
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/admin/medicines/${m.id}`) },
            { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => setEditTarget({ ...m }) },
            { label: "", divider: true },
            { label: "Delete", icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setDeleteTarget(m) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Medicines"
        description="Manage your full medicine catalog, pricing, and stock levels."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Products" }, { label: "Medicines" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => {
              const n = exportToCsv("medicines.csv", filtered, [
                { header: "Name", value: (m) => m.name },
                { header: "Generic", value: (m) => m.genericName },
                { header: "Category", value: (m) => m.category },
                { header: "Brand", value: (m) => m.brand },
                { header: "Manufacturer", value: (m) => m.manufacturer },
                { header: "Strength", value: (m) => m.strength },
                { header: "Unit", value: (m) => m.unit },
                { header: "Selling Price", value: (m) => m.sellingPrice },
                { header: "Purchase Price", value: (m) => m.purchasePrice },
                { header: "Stock", value: (m) => m.stock },
                { header: "Reorder Level", value: (m) => m.reorderLevel },
                { header: "Status", value: (m) => m.status },
                { header: "Expiry", value: (m) => m.expiry },
                { header: "SKU", value: (m) => m.sku },
              ]);
              toast(n ? { type: "success", title: "Export ready", description: `${n} medicine(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No medicines match the current filters." });
            }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Link href="/admin/medicines/create">
              <Button>
                <Plus className="h-4 w-4" /> Add Medicine
              </Button>
            </Link>
          </>
        }
      />

      <Card>
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by name, generic, or SKU…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:ml-auto lg:flex">
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); resetPage(); }}
              placeholder="All Categories"
              options={CATEGORIES.map((c) => ({ value: c.name, label: c.name }))}
            />
            <Select
              value={brand}
              onChange={(e) => { setBrand(e.target.value); resetPage(); }}
              placeholder="All Brands"
              options={BRANDS.map((b) => ({ value: b.name, label: b.name }))}
            />
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
          onRowClick={(m) => router.push(`/admin/medicines/${m.id}`)}
          empty={
            <EmptyState
              icon={<Pill className="h-6 w-6" />}
              title="No medicines found"
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

      {/* Edit medicine modal */}
      <Modal
        open={!!editTarget}
        onClose={() => { if (!savingEdit) setEditTarget(null); }}
        title="Edit Medicine"
        description="Update catalog details. Stock and expiry are managed from Batches and Stock Adjustments."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveMedicineEdit} loading={savingEdit} disabled={!editTarget?.name.trim()}>Save Changes</Button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Medicine name" value={editTarget.name} onChange={(e) => updEdit({ name: e.target.value })} />
              <Input label="Generic name" value={editTarget.genericName} onChange={(e) => updEdit({ genericName: e.target.value })} />
              <Select label="Category" value={editTarget.category} onChange={(e) => updEdit({ category: e.target.value })} placeholder="Select category" options={CATEGORIES.map((c) => ({ value: c.name, label: c.name }))} />
              <Select label="Brand" value={editTarget.brand} onChange={(e) => updEdit({ brand: e.target.value })} placeholder="Select brand" options={BRANDS.map((b) => ({ value: b.name, label: b.name }))} />
              <Select label="Manufacturer" value={editTarget.manufacturer} onChange={(e) => updEdit({ manufacturer: e.target.value })} placeholder="Select manufacturer" options={MANUFACTURERS.map((m) => ({ value: m.name, label: m.name }))} />
              <Select label="Dosage form" value={editTarget.dosageForm} onChange={(e) => updEdit({ dosageForm: e.target.value })} placeholder="Select form" options={DOSAGE_FORMS.map((d) => ({ value: d, label: d }))} />
              <Input label="Strength" value={editTarget.strength} onChange={(e) => updEdit({ strength: e.target.value })} />
              <Select label="Unit" value={editTarget.unit} onChange={(e) => updEdit({ unit: e.target.value })} placeholder="Select unit" options={UNITS.map((u) => ({ value: u, label: u }))} />
              <Input label="Selling price (Rs)" type="number" min={0} step="0.01" value={editTarget.sellingPrice} onChange={(e) => updEdit({ sellingPrice: Number(e.target.value) })} />
              <Input label="Purchase price (Rs)" type="number" min={0} step="0.01" value={editTarget.purchasePrice} onChange={(e) => updEdit({ purchasePrice: Number(e.target.value) })} />
              <Input label="Reorder level" type="number" min={0} value={editTarget.reorderLevel} onChange={(e) => updEdit({ reorderLevel: Number(e.target.value) })} />
              <Input label="SKU / Barcode" value={editTarget.sku ?? ""} onChange={(e) => updEdit({ sku: e.target.value })} />
            </div>
            <Toggle
              label="Prescription required"
              checked={editTarget.prescriptionRequired}
              onChange={(v) => updEdit({ prescriptionRequired: v })}
            />
            <Textarea label="Description" rows={3} value={editTarget.description ?? ""} onChange={(e) => updEdit({ description: e.target.value })} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete medicine"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleting(true);
                try {
                  await deleteRecord("medicines", deleteTarget.id);
                  toast({ type: "success", title: "Medicine deleted", description: `${deleteTarget.name} removed.` });
                  setDeleteTarget(null);
                } catch (deleteError) {
                  toast({ type: "danger", title: "Unable to delete medicine", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <Trash2 className="h-5 w-5 shrink-0" />
          Deleting will remove this medicine and its listing from the catalog.
        </div>
      </Modal>
    </div>
  );
}
