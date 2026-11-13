"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Eye, Pencil, Trash2, Truck, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { PURCHASES, SUPPLIERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { isValidPakistaniPhone, sanitizePhoneInput } from "@/lib/phone";
import { isValidEmail } from "@/lib/validators";
import { formatRs, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Supplier } from "@/lib/types";

const PER_PAGE = 8;

export default function SuppliersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { saveRecord, deleteRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const closeAdd = () => {
    setAddOpen(false);
    setEditTarget(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const filtered = useMemo(() => {
    return SUPPLIERS.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);
      const matchStatus = !status || s.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  const paged = paginate(filtered, page, PER_PAGE);
  const resetPage = () => setPage(1);

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Supplier",
      render: (s) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-navy-900">{s.name}</p>
            <p className="text-xs text-navy-400">{s.contactPerson}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      hideOnMobile: true,
      render: (s) => (
        <div className="min-w-0">
          <p className="text-navy-700">{s.phone}</p>
          <p className="truncate text-xs text-navy-400">{s.email}</p>
        </div>
      ),
    },
    {
      key: "totalPurchases",
      header: "Total Purchases",
      align: "right",
      render: (s) => <span className="font-medium text-navy-800">{formatRs(s.totalPurchases)}</span>,
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      hideOnMobile: true,
      render: (s) => <span className="font-medium text-success-600">{formatRs(s.paid)}</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (s) => (
        <span className={s.outstanding > 0 ? "font-semibold text-danger-600" : "font-medium text-navy-500"}>
          {formatRs(s.outstanding)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
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
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/admin/suppliers/${s.id}`) },
            { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => {
              setEditTarget(s);
              setName(s.name);
              setContactPerson(s.contactPerson);
              setPhone(s.phone);
              setEmail(s.email);
              setAddress(s.address);
              setAddOpen(true);
            } },
            { label: "", divider: true },
            { label: "Delete", icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => PURCHASES.some((purchase) => purchase.supplier === s.name) ? toast({ type: "warning", title: "Supplier has purchase history", description: "Keep this supplier while its purchase records are in use." }) : setDeleteTarget(s) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your suppliers, purchase totals, and outstanding balances."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Purchasing" }, { label: "Suppliers" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => {
              const n = exportToCsv("suppliers.csv", filtered, [
                { header: "Name", value: (s) => s.name },
                { header: "Contact Person", value: (s) => s.contactPerson },
                { header: "Phone", value: (s) => s.phone },
                { header: "Email", value: (s) => s.email },
                { header: "Address", value: (s) => s.address },
                { header: "Total Purchases", value: (s) => s.totalPurchases },
                { header: "Paid", value: (s) => s.paid },
                { header: "Outstanding", value: (s) => s.outstanding },
                { header: "Status", value: (s) => s.status },
              ]);
              toast(n ? { type: "success", title: "Export ready", description: `${n} supplier(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No suppliers match the current filters." });
            }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by name, contact, phone, or email…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-auto lg:flex">
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); resetPage(); }}
              placeholder="All Status"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          onRowClick={(s) => router.push(`/admin/suppliers/${s.id}`)}
          empty={
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title="No suppliers found"
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

      {/* Add supplier modal */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title={editTarget ? "Edit Supplier" : "Add Supplier"}
        description={editTarget ? "Update this supplier's details." : "Register a new supplier for purchase orders."}
        footer={
          <>
            <Button variant="outline" onClick={closeAdd}>Cancel</Button>
            <Button
              disabled={!name.trim() || !contactPerson.trim()}
              onClick={async () => {
                const trimmedPhone = phone.trim();
                if (trimmedPhone && !isValidPakistaniPhone(trimmedPhone)) {
                  toast({ type: "warning", title: "Invalid phone number", description: "Enter a valid Pakistani number, e.g. 03001234567 or +92 21 3453 0001." });
                  return;
                }
                const trimmedEmail = email.trim();
                if (trimmedEmail && !isValidEmail(trimmedEmail)) {
                  toast({ type: "warning", title: "Invalid email", description: "Enter a valid email address, e.g. orders@supplier.pk." });
                  return;
                }
                try {
                  await saveRecord("suppliers", {
                    id: editTarget?.id ?? crypto.randomUUID(),
                    name: name.trim(),
                    contactPerson: contactPerson.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                    address: address.trim(),
                    totalPurchases: editTarget?.totalPurchases ?? 0,
                    paid: editTarget?.paid ?? 0,
                    outstanding: editTarget?.outstanding ?? 0,
                    status: editTarget?.status ?? "active",
                  });
                  toast({ type: "success", title: editTarget ? "Supplier updated" : "Supplier added", description: `${name.trim()} ${editTarget ? "updated" : "added"}.` });
                  closeAdd();
                } catch (saveError) {
                  toast({ type: "danger", title: "Unable to save supplier", description: saveError instanceof Error ? saveError.message : "Please try again." });
                }
              }}
            >
              {editTarget ? "Save Changes" : "Save Supplier"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Supplier Name" required disabled={!!editTarget && PURCHASES.some((purchase) => purchase.supplier === editTarget.name)} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. United Distributors" />
          <Input label="Contact Person" required value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} placeholder="e.g. Sana Riaz" />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            maxLength={16}
            value={phone}
            onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
            placeholder="03001234567 or +92 ..."
            hint="Pakistani number only"
          />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="orders@example.pk" />
          <div className="sm:col-span-2">
            <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, area, city" rows={2} />
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete supplier"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteRecord("suppliers", deleteTarget.id);
                  toast({ type: "success", title: "Supplier deleted", description: `${deleteTarget.name} removed.` });
                  setDeleteTarget(null);
                } catch (deleteError) {
                  toast({ type: "danger", title: "Unable to delete supplier", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
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
          Suppliers with purchase history cannot be deleted.
        </div>
      </Modal>
    </div>
  );
}
