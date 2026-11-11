"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { BRANDS, MANUFACTURERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Brand } from "@/lib/types";

const PER_PAGE = 8;

export default function BrandsPage() {
  const { toast } = useToast();
  const { saveRecord, deleteRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return BRANDS.filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.manufacturer.toLowerCase().includes(q),
    );
  }, [search]);

  const paged = paginate(filtered, page, PER_PAGE);

  const closeAdd = () => {
    setAddOpen(false);
    setEditTarget(null);
    setName("");
    setManufacturer("");
  };

  const saveBrand = async () => {
    const trimmed = name.trim();
    const duplicate = BRANDS.some(
      (b) => b.id !== editTarget?.id && b.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast({ type: "warning", title: "Already exists", description: `A brand named "${trimmed}" already exists.` });
      return;
    }
    try {
      await saveRecord("brands", {
        id: editTarget?.id ?? crypto.randomUUID(),
        name: name.trim(),
        manufacturer,
        medicineCount: editTarget?.medicineCount ?? 0,
      });
      toast({ type: "success", title: editTarget ? "Brand updated" : "Brand saved", description: `${name.trim()} ${editTarget ? "updated" : "added"}.` });
      closeAdd();
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save brand", description: saveError instanceof Error ? saveError.message : "Please try again." });
    }
  };

  const columns: Column<Brand>[] = [
    {
      key: "name",
      header: "Brand",
      render: (b) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Tag className="h-4 w-4" />
          </span>
          <span className="font-medium text-navy-900">{b.name}</span>
        </div>
      ),
    },
    {
      key: "manufacturer",
      header: "Manufacturer",
      render: (b) => <span className="text-navy-600">{b.manufacturer}</span>,
    },
    {
      key: "medicineCount",
      header: "Medicines",
      align: "center",
      render: (b) => <Badge tone="navy">{b.medicineCount}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
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
            {
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => {
                setEditTarget(b);
                setName(b.name);
                setManufacturer(b.manufacturer);
                setAddOpen(true);
              },
            },
            { label: "", divider: true },
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => setDeleteTarget(b),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage the brands carried across your medicine catalog."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Products" },
          { label: "Brands" },
        ]}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Brand
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by brand or manufacturer…"
            className="lg:max-w-xs lg:flex-1"
          />
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Tag className="h-6 w-6" />}
              title="No brands found"
              description="Try adjusting your search."
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

      {/* Add brand modal */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title={editTarget ? "Edit Brand" : "Add Brand"}
        description={editTarget ? "Update this brand's details." : "Register a new brand under a manufacturer."}
        footer={
          <>
            <Button variant="outline" onClick={closeAdd}>
              Cancel
            </Button>
            <Button onClick={saveBrand} disabled={!name.trim()}>{editTarget ? "Save Changes" : "Save Brand"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Brand name"
            placeholder="e.g. Panadol"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="Select a manufacturer"
            options={MANUFACTURERS.map((m) => ({
              value: m.name,
              label: m.name,
            }))}
          />
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete brand"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteRecord("brands", deleteTarget.id);
                  toast({ type: "success", title: "Brand deleted", description: `${deleteTarget.name} removed.` });
                  setDeleteTarget(null);
                } catch (deleteError) {
                  toast({ type: "danger", title: "Unable to delete brand", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
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
          Medicines listed under this brand will need to be reassigned.
        </div>
      </Modal>
    </div>
  );
}
