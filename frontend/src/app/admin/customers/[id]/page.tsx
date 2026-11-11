"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MapPin,
  Wallet,
  AlertTriangle,
  Calendar,
  Receipt,
  FileText,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { CUSTOMERS, SALES, PAYMENTS, PRESCRIPTIONS } from "@/lib/data";
import { formatRs, formatDate, initials } from "@/lib/utils";
import type { Sale, Payment, Prescription } from "@/lib/types";

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

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "purchases", label: "Purchase History" },
  { value: "payments", label: "Payments" },
  { value: "prescriptions", label: "Prescriptions" },
  { value: "outstanding", label: "Outstanding" },
];

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customer = CUSTOMERS.find((c) => c.id === params.id);

  const [tab, setTab] = useState("profile");

  const customerName = customer?.name ?? "";

  const sales = useMemo(
    () => SALES.filter((s) => s.customer === customerName),
    [customerName],
  );

  const payments = useMemo<Payment[]>(() => {
    const matched = PAYMENTS.filter((p) => p.party === customerName && p.type === "incoming");
    if (matched.length > 0) return matched;
    return [
      { id: "d1", reference: "PMT-0000", party: customerName, type: "incoming", amount: 1200, method: "cash", date: "2026-09-20", status: "completed" },
      { id: "d2", reference: "PMT-0001", party: customerName, type: "incoming", amount: 850, method: "card", date: "2026-09-10", status: "completed" },
    ];
  }, [customerName]);

  const prescriptions = useMemo(
    () => PRESCRIPTIONS.filter((p) => p.patient === customerName),
    [customerName],
  );

  if (!customer) {
    return (
      <div>
        <PageHeader title="Customer not found" breadcrumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Not found" }]} />
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Customer not found"
            description="The customer you are looking for does not exist."
            action={<Link href="/admin/customers"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Customers</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  const avatar = avatarColor(customer.name);

  const profileRows = [
    { label: "Full Name", value: customer.name },
    { label: "Phone", value: customer.phone },
    { label: "Email", value: customer.email },
    { label: "Address", value: customer.address },
    { label: "Last Purchase", value: formatDate(customer.lastPurchase) },
    { label: "Status", value: customer.status === "active" ? "Active" : "Inactive" },
  ];

  const saleColumns: Column<Sale>[] = [
    { key: "invoice", header: "Invoice", render: (s) => <span className="font-medium text-navy-900">{s.invoice}</span> },
    { key: "itemCount", header: "Items", align: "center", render: (s) => <span className="text-navy-600">{s.itemCount}</span> },
    { key: "total", header: "Total", align: "right", render: (s) => <span className="font-semibold text-navy-900">{formatRs(s.total)}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (s) => <span className="text-navy-500">{formatDate(s.date)}</span> },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: "reference", header: "Reference", render: (p) => <span className="font-medium text-navy-900">{p.reference}</span> },
    { key: "amount", header: "Amount", align: "right", render: (p) => <span className="font-semibold text-navy-900">{formatRs(p.amount)}</span> },
    { key: "method", header: "Method", render: (p) => <span className="capitalize text-navy-600">{p.method}</span> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  const prescriptionColumns: Column<Prescription>[] = [
    { key: "code", header: "Code", render: (p) => <span className="font-medium text-navy-900">{p.code}</span> },
    { key: "doctor", header: "Doctor", render: (p) => <span className="text-navy-600">{p.doctor}</span> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={`Customer since ${formatDate(customer.lastPurchase)}`}
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Customers", href: "/admin/customers" },
          { label: customer.name },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: profile */}
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex flex-col items-center text-center">
              <span className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${avatar.bg} ${avatar.text}`}>
                {initials(customer.name)}
              </span>
              <h2 className="mt-3 text-lg font-semibold text-navy-900">{customer.name}</h2>
              <p className="text-sm text-navy-500">{customer.email}</p>
              <div className="mt-3">
                <StatusBadge status={customer.status} />
              </div>
            </div>
            <div className="mt-5 space-y-3 border-t border-navy-100 pt-5 text-sm">
              <div className="flex items-center gap-3 text-navy-600">
                <Phone className="h-4 w-4 shrink-0 text-navy-400" /> {customer.phone}
              </div>
              <div className="flex items-center gap-3 text-navy-600">
                <Mail className="h-4 w-4 shrink-0 text-navy-400" /> <span className="truncate">{customer.email}</span>
              </div>
              <div className="flex items-start gap-3 text-navy-600">
                <MapPin className="h-4 w-4 shrink-0 text-navy-400" /> <span>{customer.address}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Right: stats + tabs */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Purchases" value={formatRs(customer.totalPurchases)} icon={<Wallet className="h-5 w-5" />} tone="primary" />
            <StatCard label="Outstanding" value={formatRs(customer.outstanding)} icon={<AlertTriangle className="h-5 w-5" />} tone={customer.outstanding > 0 ? "danger" : "navy"} />
            <StatCard label="Last Purchase" value={formatDate(customer.lastPurchase)} icon={<Calendar className="h-5 w-5" />} tone="info" />
          </div>

          <Card>
            <div className="px-4 pt-2">
              <Tabs items={TABS} value={tab} onChange={setTab} />
            </div>

            {tab === "profile" && (
              <CardBody>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {profileRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between border-b border-navy-50 py-1.5 sm:block sm:border-0 sm:py-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{row.label}</dt>
                      <dd className="text-sm font-medium text-navy-800 sm:mt-0.5">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            )}

            {tab === "purchases" && (
              <DataTable
                columns={saleColumns}
                rows={sales}
                empty={<EmptyState icon={<Receipt className="h-6 w-6" />} title="No purchases" description="No sales on record for this customer." />}
              />
            )}

            {tab === "payments" && (
              <DataTable
                columns={paymentColumns}
                rows={payments}
                empty={<EmptyState icon={<CreditCard className="h-6 w-6" />} title="No payments" description="No incoming payments on record." />}
              />
            )}

            {tab === "prescriptions" && (
              <DataTable
                columns={prescriptionColumns}
                rows={prescriptions}
                empty={<EmptyState icon={<FileText className="h-6 w-6" />} title="No prescriptions" description="No prescriptions on record for this customer." />}
              />
            )}

            {tab === "outstanding" && (
              <CardBody>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-xl p-4 ${customer.outstanding > 0 ? "bg-danger-50" : "bg-success-50"}`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Outstanding Balance</p>
                    <p className={`mt-1 text-2xl font-bold ${customer.outstanding > 0 ? "text-danger-700" : "text-success-700"}`}>
                      {formatRs(customer.outstanding)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-navy-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Lifetime Purchases</p>
                    <p className="mt-1 text-2xl font-bold text-navy-900">{formatRs(customer.totalPurchases)}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-navy-500">
                  {customer.outstanding > 0
                    ? "This customer has an unpaid balance. Consider following up before extending further credit."
                    : "This customer has no outstanding balance. All invoices are settled."}
                </p>
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
