"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Factory, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import type { Manufacturer } from "@/lib/types";

const PER_PAGE = 8;

export default function ManufacturersPage() {
  const { toast } = useToast();
  const { saveRecord, deleteRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [contact, setContact] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);
  const [editTarget, setEditTarget] = useState<Manufacturer | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MANUFACTURERS.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.country.toLowerCase().includes(q),
    );
  }, [search]);

  const paged = paginate(filtered, page, PER_PAGE);

  const closeAdd = () => {
    setAddOpen(false);
    setEditTarget(null);
    setName("");
    setCountry("");
    setContact("");
  };

  const saveManufacturer = async () => {
    const trimmed = name.trim();
    const duplicate = MANUFACTURERS.some(
      (m) => m.id !== editTarget?.id && m.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast({ type: "warning", title: "Already exists", description: `A manufacturer named "${trimmed}" already exists.` });
      return;
    }
    try {
      await saveRecord("manufacturers", {
        id: editTarget?.id ?? crypto.randomUUID(),
        name: name.trim(),
        country: country.trim(),
        contact: contact.trim(),
        productCount: editTarget?.productCount ?? 0,
      });
      toast({ type: "success", title: editTarget ? "Manufacturer updated" : "Manufacturer saved", description: `${name.trim()} ${editTarget ? "updated" : "added"}.` });
      closeAdd();
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save manufacturer", description: saveError instanceof Error ? saveError.message : "Please try again." });
    }
  };

  const columns: Column<Manufacturer>[] = [
    {
      key: "name",
      header: "Manufacturer",
      render: (m) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Factory className="h-4 w-4" />
          </span>
          <span className="font-medium text-navy-900">{m.name}</span>
        </div>
      ),
    },
    {
      key: "country",
      header: "Country",
      render: (m) => <span className="text-navy-600">{m.country}</span>,
    },
    {
      key: "contact",
      header: "Contact",
      hideOnMobile: true,
      render: (m) => (
        <span className="inline-flex items-center gap-1.5 text-navy-600">
          <Phone className="h-3.5 w-3.5 text-navy-400" />
          {m.contact}
        </span>
      ),
    },
    {
      key: "productCount",
      header: "Products",
      align: "center",
      render: (m) => <Badge tone="navy">{m.productCount}</Badge>,
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
            {
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => {
                setEditTarget(m);
                setName(m.name);
                setCountry(m.country);
                setContact(m.contact);
                setAddOpen(true);
              },
            },
            { label: "", divider: true },
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => m.productCount > 0 || BRANDS.some((brand) => brand.manufacturer === m.name)
                ? toast({ type: "warning", title: "Manufacturer is in use", description: "Reassign its products and brands before deleting it." })
                : setDeleteTarget(m),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Manufacturers"
        description="Manage the pharmaceutical manufacturers you source from."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Products" },
          { label: "Manufacturers" },
        ]}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Manufacturer
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
            placeholder="Search by name or country…"
            className="lg:max-w-xs lg:flex-1"
          />
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Factory className="h-6 w-6" />}
              title="No manufacturers found"
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

      {/* Add manufacturer modal */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title={editTarget ? "Edit Manufacturer" : "Add Manufacturer"}
        description={editTarget ? "Update this manufacturer's details." : "Register a new manufacturer in your supplier network."}
        footer={
          <>
            <Button variant="outline" onClick={closeAdd}>
              Cancel
            </Button>
            <Button onClick={saveManufacturer} disabled={!name.trim()}>{editTarget ? "Save Changes" : "Save Manufacturer"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Manufacturer name"
            placeholder="e.g. GSK Pharmaceuticals"
            disabled={!!editTarget && (editTarget.productCount > 0 || BRANDS.some((brand) => brand.manufacturer === editTarget.name))}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Country"
            placeholder="e.g. Pakistan"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <Input
            label="Contact number"
            placeholder="e.g. +92 21 111 475 725"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete manufacturer"
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
                  await deleteRecord("manufacturers", deleteTarget.id);
                  toast({ type: "success", title: "Manufacturer deleted", description: `${deleteTarget.name} removed.` });
                  setDeleteTarget(null);
                } catch (deleteError) {
                  toast({ type: "danger", title: "Unable to delete manufacturer", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
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
          Brands and products linked to this manufacturer will need reassigning.
        </div>
      </Modal>
    </div>
  );
}
