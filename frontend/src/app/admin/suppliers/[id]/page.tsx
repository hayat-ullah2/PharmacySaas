"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  User,
  Wallet,
  CreditCard,
  AlertTriangle,
  Receipt,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { SUPPLIERS, PURCHASES, PAYMENTS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { isValidPakistaniPhone, sanitizePhoneInput } from "@/lib/phone";
import { isValidEmail } from "@/lib/validators";
import { formatRs, formatDate, initials } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Purchase, Payment, PaymentMethod } from "@/lib/types";

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

type AgingRow = { id: string; bucket: string; amount: number };
type TxnRow = { id: string; ref: string; type: string; amount: number; date: string; status: string };

const TABS = [
  { value: "purchases", label: "Purchase History" },
  { value: "payments", label: "Payments" },
  { value: "outstanding", label: "Outstanding" },
  { value: "transactions", label: "Recent Transactions" },
];

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { saveRecord, deleteRecord } = usePharmacyData();
  const supplier = SUPPLIERS.find((s) => s.id === params.id);

  const [tab, setTab] = useState("purchases");
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState("bank");
  const [payAmount, setPayAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit + delete
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supplierName = supplier?.name ?? "";

  const openEdit = () => {
    if (!supplier) return;
    setName(supplier.name);
    setContactPerson(supplier.contactPerson);
    setPhone(supplier.phone);
    setEmail(supplier.email);
    setAddress(supplier.address);
    setEditStatus(supplier.status);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!supplier) return;
    if (name.trim().length < 2) {
      toast({ type: "warning", title: "Name required", description: "Enter a supplier name (at least 2 characters)." });
      return;
    }
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
    setSavingEdit(true);
    try {
      await saveRecord("suppliers", {
        ...supplier,
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: trimmedPhone,
        email: email.trim(),
        address: address.trim(),
        status: editStatus as "active" | "inactive",
      });
      toast({ type: "success", title: "Supplier updated", description: `${name.trim()} saved.` });
      setEditOpen(false);
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to update supplier", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteSupplier = async () => {
    if (!supplier) return;
    setDeleting(true);
    try {
      await deleteRecord("suppliers", supplier.id);
      toast({ type: "success", title: "Supplier deleted", description: `${supplier.name} removed.` });
      router.push("/admin/suppliers");
    } catch (deleteError) {
      toast({ type: "danger", title: "Unable to delete supplier", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
      setDeleting(false);
    }
  };

  const recordPayment = async () => {
    if (!supplier) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ type: "warning", title: "Invalid amount", description: "Enter an amount greater than zero." });
      return;
    }
    setSaving(true);
    try {
      const paymentId = crypto.randomUUID();
      await saveRecord("payments", {
        id: paymentId,
        reference: `PMT-${paymentId.replace(/-/g, "").slice(-6).toUpperCase()}`,
        party: supplier.name,
        type: "outgoing",
        amount,
        method: payMethod as PaymentMethod,
        date: new Date().toISOString().slice(0, 10),
        status: "completed",
      });
      await saveRecord("suppliers", { ...supplier, outstanding: Math.max(0, supplier.outstanding - amount), paid: (supplier.paid ?? 0) + amount });
      toast({ type: "success", title: "Payment recorded", description: `${formatRs(amount)} paid to ${supplier.name}.` });
      setPayOpen(false);
      setPayAmount("");
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to record payment", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const purchases = PURCHASES.filter((p) => p.supplier === supplierName);
  const payments: Payment[] = PAYMENTS.filter((p) => p.party === supplierName && p.type === "outgoing");

  if (!supplier) {
    return (
      <div>
        <PageHeader title="Supplier not found" breadcrumbs={[{ label: "Suppliers", href: "/admin/suppliers" }, { label: "Not found" }]} />
        <Card>
          <EmptyState
            icon={<Truck className="h-6 w-6" />}
            title="Supplier not found"
            description="The supplier you are looking for does not exist."
            action={<Link href="/admin/suppliers"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Suppliers</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  const avatar = avatarColor(supplier.name);

  const aging: AgingRow[] = [
    { id: "a1", bucket: "0 – 30 days", amount: Math.round(supplier.outstanding * 0.6) },
    { id: "a2", bucket: "31 – 60 days", amount: Math.round(supplier.outstanding * 0.25) },
    { id: "a3", bucket: "61 – 90 days", amount: Math.round(supplier.outstanding * 0.1) },
    { id: "a4", bucket: "90+ days", amount: Math.round(supplier.outstanding * 0.05) },
  ];

  const transactions: TxnRow[] = [
    ...purchases.slice(0, 3).map((p) => ({ id: `t-${p.id}`, ref: p.poNumber, type: "Purchase Order", amount: p.total, date: p.date, status: p.status })),
    ...payments.slice(0, 3).map((p) => ({ id: `t-${p.id}`, ref: p.reference, type: "Payment", amount: p.amount, date: p.date, status: p.status })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const purchaseColumns: Column<Purchase>[] = [
    { key: "poNumber", header: "PO Number", render: (p) => <span className="font-medium text-navy-900">{p.poNumber}</span> },
    { key: "itemCount", header: "Items", align: "center", render: (p) => <span className="text-navy-600">{p.itemCount}</span> },
    { key: "total", header: "Total", align: "right", render: (p) => <span className="font-semibold text-navy-900">{formatRs(p.total)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span> },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: "reference", header: "Reference", render: (p) => <span className="font-medium text-navy-900">{p.reference}</span> },
    { key: "amount", header: "Amount", align: "right", render: (p) => <span className="font-semibold text-navy-900">{formatRs(p.amount)}</span> },
    { key: "method", header: "Method", render: (p) => <span className="capitalize text-navy-600">{p.method}</span> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  const agingColumns: Column<AgingRow>[] = [
    { key: "bucket", header: "Age", render: (a) => <span className="font-medium text-navy-800">{a.bucket}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (a) => <span className={a.amount > 0 ? "font-semibold text-danger-600" : "text-navy-500"}>{formatRs(a.amount)}</span>,
    },
  ];

  const txnColumns: Column<TxnRow>[] = [
    { key: "ref", header: "Reference", render: (t) => <span className="font-medium text-navy-900">{t.ref}</span> },
    { key: "type", header: "Type", render: (t) => <span className="text-navy-600">{t.type}</span> },
    { key: "amount", header: "Amount", align: "right", render: (t) => <span className="font-semibold text-navy-900">{formatRs(t.amount)}</span> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (t) => <span className="text-navy-500">{formatDate(t.date)}</span> },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title={supplier.name}
        description={`Managed by ${supplier.contactPerson}`}
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Suppliers", href: "/admin/suppliers" },
          { label: supplier.name },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => setPayOpen(true)}>
              <CreditCard className="h-4 w-4" /> Record Payment
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: profile */}
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex flex-col items-center text-center">
              <span className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${avatar.bg} ${avatar.text}`}>
                {initials(supplier.name)}
              </span>
              <h2 className="mt-3 text-lg font-semibold text-navy-900">{supplier.name}</h2>
              <p className="text-sm text-navy-500">{supplier.contactPerson}</p>
              <div className="mt-3">
                <StatusBadge status={supplier.status} />
              </div>
            </div>
            <div className="mt-5 space-y-3 border-t border-navy-100 pt-5 text-sm">
              <div className="flex items-center gap-3 text-navy-600">
                <User className="h-4 w-4 shrink-0 text-navy-400" /> {supplier.contactPerson}
              </div>
              <div className="flex items-center gap-3 text-navy-600">
                <Phone className="h-4 w-4 shrink-0 text-navy-400" /> {supplier.phone}
              </div>
              <div className="flex items-center gap-3 text-navy-600">
                <Mail className="h-4 w-4 shrink-0 text-navy-400" /> <span className="truncate">{supplier.email}</span>
              </div>
              <div className="flex items-start gap-3 text-navy-600">
                <MapPin className="h-4 w-4 shrink-0 text-navy-400" /> <span>{supplier.address}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Right: stats + tabs */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Purchases" value={formatRs(supplier.totalPurchases, { compact: true })} icon={<Wallet className="h-5 w-5" />} tone="primary" />
            <StatCard label="Paid" value={formatRs(supplier.paid, { compact: true })} icon={<CreditCard className="h-5 w-5" />} tone="success" />
            <StatCard label="Outstanding" value={formatRs(supplier.outstanding, { compact: true })} icon={<AlertTriangle className="h-5 w-5" />} tone={supplier.outstanding > 0 ? "danger" : "navy"} />
          </div>

          <Card>
            <div className="px-4 pt-2">
              <Tabs items={TABS} value={tab} onChange={setTab} />
            </div>

            {tab === "purchases" && (
              <DataTable
                columns={purchaseColumns}
                rows={purchases}
                empty={<EmptyState icon={<Receipt className="h-6 w-6" />} title="No purchases" description="No purchase orders on record." />}
              />
            )}

            {tab === "payments" && (
              <DataTable
                columns={paymentColumns}
                rows={payments}
                empty={<EmptyState icon={<CreditCard className="h-6 w-6" />} title="No payments" description="No outgoing payments on record." />}
              />
            )}

            {tab === "outstanding" && (
              <div>
                <CardBody>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-danger-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Outstanding Balance</p>
                      <p className="mt-1 text-2xl font-bold text-danger-700">{formatRs(supplier.outstanding)}</p>
                    </div>
                    <div className="rounded-xl bg-navy-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Paid to Date</p>
                      <p className="mt-1 text-2xl font-bold text-navy-900">{formatRs(supplier.paid)}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-navy-500">Outstanding balance broken down by ageing buckets.</p>
                </CardBody>
                <DataTable
                  columns={agingColumns}
                  rows={aging}
                  empty={<EmptyState title="Nothing outstanding" description="This supplier has no outstanding balance." />}
                />
              </div>
            )}

            {tab === "transactions" && (
              <DataTable
                columns={txnColumns}
                rows={transactions}
                empty={<EmptyState icon={<Receipt className="h-6 w-6" />} title="No transactions" description="No recent activity on record." />}
              />
            )}
          </Card>
        </div>
      </div>

      {/* Record payment modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record Payment"
        description={`Record an outgoing payment to ${supplier.name}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={recordPayment} loading={saving} disabled={!payAmount}>
              Record Payment
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Input label="Amount (Rs)" type="number" placeholder="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          <Select
            label="Payment Method"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={[
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "bank", label: "Bank Transfer" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
      </Modal>

      {/* Edit supplier modal */}
      <Modal
        open={editOpen}
        onClose={() => { if (!savingEdit) setEditOpen(false); }}
        title="Edit Supplier"
        description="Update this supplier's details."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveEdit} loading={savingEdit} disabled={!name.trim()}>Save Changes</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Supplier Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. United Distributors" />
          <Input label="Contact Person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="e.g. Sana Riaz" />
          <Input label="Phone" type="tel" inputMode="tel" maxLength={16} value={phone} onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))} placeholder="03001234567 or +92 ..." hint="Pakistani number only" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@example.pk" />
          <Select label="Status" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          <div className="sm:col-span-2">
            <Textarea label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" rows={2} />
          </div>
        </div>
      </Modal>

      {/* Delete supplier modal */}
      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title="Delete supplier"
        description={`Are you sure you want to delete ${supplier.name}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={deleteSupplier} loading={deleting}>Delete</Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <Trash2 className="h-5 w-5 shrink-0" />
          This removes the supplier from your list. Past purchase records keep their supplier name.
        </div>
      </Modal>
    </div>
  );
}
