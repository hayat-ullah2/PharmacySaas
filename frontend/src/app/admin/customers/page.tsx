"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Eye, Pencil, Trash2, Users } from "lucide-react";
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
import { CUSTOMERS, SALES } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, initials, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { Customer } from "@/lib/types";

const PER_PAGE = 8;

const AVATAR_COLORS = [
  { bg: "bg-primary-100", text: "text-primary-700" },
  { bg: "bg-success-100", text: "text-success-700" },
  { bg: "bg-warning-100", text: "text-warning-700" },
  { bg: "bg-info-100", text: "text-info-700" },
  { bg: "bg-danger-100", text: "text-danger-700" },
  { bg: "bg-navy-100", text: "text-navy-700" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { saveRecord, deleteRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const closeAdd = () => {
    setAddOpen(false);
    setEditTarget(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const filtered = useMemo(() => {
    return CUSTOMERS.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      const matchStatus = !status || c.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  const paged = paginate(filtered, page, PER_PAGE);
  const resetPage = () => setPage(1);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => {
        const a = avatarColor(c.name);
        return (
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${a.bg} ${a.text}`}>
              {initials(c.name)}
            </span>
            <p className="font-medium text-navy-900">{c.name}</p>
          </div>
        );
      },
    },
    { key: "phone", header: "Phone", render: (c) => <span className="text-navy-700">{c.phone}</span> },
    { key: "email", header: "Email", hideOnMobile: true, render: (c) => <span className="text-navy-500">{c.email}</span> },
    {
      key: "totalPurchases",
      header: "Total Purchases",
      align: "right",
      render: (c) => <span className="font-medium text-navy-800">{formatRs(c.totalPurchases)}</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (c) => (
        <span className={c.outstanding > 0 ? "font-semibold text-danger-600" : "font-medium text-navy-500"}>
          {formatRs(c.outstanding)}
        </span>
      ),
    },
    {
      key: "lastPurchase",
      header: "Last Purchase",
      align: "right",
      hideOnMobile: true,
      render: (c) => <span className="text-navy-500">{formatDate(c.lastPurchase)}</span>,
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
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
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/admin/customers/${c.id}`) },
            { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => {
              setEditTarget(c);
              setName(c.name);
              setPhone(c.phone);
              setEmail(c.email);
              setAddress(c.address);
              setAddOpen(true);
            } },
            { label: "", divider: true },
            { label: "Delete", icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => SALES.some((sale) => sale.customer === c.name) ? toast({ type: "warning", title: "Customer has sales history", description: "Keep this customer while its sales records are in use." }) : setDeleteTarget(c) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Track your customers, purchase history, and outstanding balances."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Sales" }, { label: "Customers" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => {
              const n = exportToCsv("customers.csv", filtered, [
                { header: "Name", value: (c) => c.name },
                { header: "Phone", value: (c) => c.phone },
                { header: "Email", value: (c) => c.email },
                { header: "Total Purchases", value: (c) => c.totalPurchases },
                { header: "Outstanding", value: (c) => c.outstanding },
                { header: "Last Purchase", value: (c) => c.lastPurchase },
                { header: "Status", value: (c) => c.status },
                { header: "Address", value: (c) => c.address },
              ]);
              toast(n ? { type: "success", title: "Export ready", description: `${n} customer(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No customers match the current filters." });
            }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by name, phone, or email…"
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
          onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
          empty={
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No customers found"
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

      {/* Add customer modal */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title={editTarget ? "Edit Customer" : "Add Customer"}
        description={editTarget ? "Update this customer's details." : "Create a new customer profile."}
        footer={
          <>
            <Button variant="outline" onClick={closeAdd}>Cancel</Button>
            <Button
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  await saveRecord("customers", {
                    id: editTarget?.id ?? crypto.randomUUID(),
                    name: name.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                    totalPurchases: editTarget?.totalPurchases ?? 0,
                    outstanding: editTarget?.outstanding ?? 0,
                    lastPurchase: editTarget?.lastPurchase ?? "",
                    status: editTarget?.status ?? "active",
                    address: address.trim(),
                  });
                  toast({ type: "success", title: editTarget ? "Customer updated" : "Customer added", description: `${name.trim()} ${editTarget ? "updated" : "added"}.` });
                  closeAdd();
                } catch (saveError) {
                  toast({ type: "danger", title: "Unable to save customer", description: saveError instanceof Error ? saveError.message : "Please try again." });
                }
              }}
            >
              {editTarget ? "Save Changes" : "Save Customer"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full Name" required disabled={!!editTarget && SALES.some((sale) => sale.customer === editTarget.name)} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ali Hassan" />
          <Input label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+92 ..." />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          <div className="sm:col-span-2">
            <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, area, city" rows={2} />
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete customer"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteRecord("customers", deleteTarget.id);
                  toast({ type: "success", title: "Customer deleted", description: `${deleteTarget.name} removed.` });
                  setDeleteTarget(null);
                } catch (deleteError) {
                  toast({ type: "danger", title: "Unable to delete customer", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
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
          Customers with sales history cannot be deleted.
        </div>
      </Modal>
    </div>
  );
}
