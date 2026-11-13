"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Download, Eye, Pencil, Trash2, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { MedicineEditModal } from "@/components/medicines/MedicineEditModal";
import { MEDICINES, CATEGORIES, BRANDS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Medicine } from "@/lib/types";

const PER_PAGE = 8;

export default function MedicinesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { deleteRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);

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

      {editTarget && (
        <MedicineEditModal medicine={editTarget} onClose={() => setEditTarget(null)} />
      )}

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
