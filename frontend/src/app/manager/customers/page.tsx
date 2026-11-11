"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
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
import { CUSTOMERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, initials, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Customer } from "@/lib/types";

const PER_PAGE = 8;

const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-success-100 text-success-700",
  "bg-warning-100 text-warning-700",
  "bg-info-100 text-info-700",
  "bg-danger-100 text-danger-700",
  "bg-navy-100 text-navy-700",
];

function avatarClass(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function ManagerCustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

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
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarClass(c.name)}`}>
            {initials(c.name)}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-navy-900">{c.name}</p>
            <p className="text-xs text-navy-400">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", hideOnMobile: true, render: (c) => <span className="text-navy-600">{c.phone}</span> },
    { key: "totalPurchases", header: "Total Purchases", align: "right", render: (c) => <span className="font-semibold text-navy-900">{formatRs(c.totalPurchases)}</span> },
    { key: "lastPurchase", header: "Last Purchase", align: "right", hideOnMobile: true, render: (c) => <span className="text-navy-500">{formatDate(c.lastPurchase)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  const submit = async () => {
    if (!name.trim()) {
      toast({ type: "warning", title: "Name required", description: "Please enter the customer's name." });
      return;
    }
    try {
      await saveRecord("customers", {
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        totalPurchases: 0,
        outstanding: 0,
        lastPurchase: "",
        status: "active",
        address: "",
      });
      toast({ type: "success", title: "Customer added", description: `${name.trim()} added to the customer list.` });
      setOpen(false);
      setName("");
      setPhone("");
      setEmail("");
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save customer", description: saveError instanceof Error ? saveError.message : "Please try again." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="View customer profiles and purchase history."
        breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "People & Insights" }, { label: "Customers" }]}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
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
          <div className="lg:ml-auto">
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
          onRowClick={(c) => router.push(`/manager/customers/${c.id}`)}
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Customer"
        description="Create a new customer profile."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Add Customer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ali Hassan" />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
      </Modal>
    </div>
  );
}
