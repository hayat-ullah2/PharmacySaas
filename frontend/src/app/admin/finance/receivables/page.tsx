"use client";

import { useMemo, useState } from "react";
import { HandCoins, Users, Sigma, Wallet, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { CUSTOMERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Customer, PaymentMethod } from "@/lib/types";

const PER_PAGE = 8;

// Balance-based risk tier (dummy data has only recent purchase dates, so an
// amount tier is more meaningful — and honest — than a days-overdue label).
function riskTier(outstanding: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (outstanding >= 5000) return { label: "High", tone: "danger" };
  if (outstanding >= 3000) return { label: "Medium", tone: "warning" };
  return { label: "Low", tone: "success" };
}

export default function ReceivablesPage() {
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [payTarget, setPayTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState({ amount: "", method: "cash" });

  const resetPage = () => setPage(1);

  const debtors = useMemo(() => CUSTOMERS.filter((c) => c.outstanding > 0), []);

  const totalReceivable = useMemo(() => debtors.reduce((s, c) => s + c.outstanding, 0), [debtors]);
  const avgReceivable = debtors.length ? Math.round(totalReceivable / debtors.length) : 0;

  const filtered = useMemo(() => {
    return debtors.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);
      const matchBucket = !bucket || riskTier(c.outstanding).label === bucket;
      return matchSearch && matchBucket;
    });
  }, [debtors, search, bucket]);

  const paged = paginate(filtered, page, PER_PAGE);

  const openPay = (c: Customer) => {
    setForm({ amount: String(c.outstanding), method: "cash" });
    setPayTarget(c);
  };

  const columns: Column<Customer>[] = [
    { key: "name", header: "Customer", render: (c) => <span className="font-medium text-navy-900">{c.name}</span> },
    { key: "phone", header: "Phone", hideOnMobile: true, render: (c) => <span className="text-navy-600">{c.phone}</span> },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (c) => <span className="font-semibold text-danger-600">{formatRs(c.outstanding)}</span>,
    },
    {
      key: "lastPurchase",
      header: "Last Purchase",
      align: "right",
      hideOnMobile: true,
      render: (c) => <span className="text-navy-500">{formatDate(c.lastPurchase)}</span>,
    },
    {
      key: "risk",
      header: "Risk",
      render: (c) => {
        const a = riskTier(c.outstanding);
        return <Badge tone={a.tone} dot>{a.label}</Badge>;
      },
    },
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
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
          items={[
            {
              label: "Record Payment",
              icon: <Wallet className="h-4 w-4" />,
              onClick: () => openPay(c),
            },
          ]}
        />
      ),
    },
  ];

  const submit = async () => {
    if (!payTarget) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ type: "warning", title: "Invalid amount", description: "Enter an amount greater than zero." });
      return;
    }
    setSaving(true);
    try {
      await saveRecord("payments", {
        id: crypto.randomUUID(),
        reference: `PMT-${Date.now().toString().slice(-6)}`,
        party: payTarget.name,
        type: "incoming",
        amount,
        method: form.method as PaymentMethod,
        date: new Date().toISOString().slice(0, 10),
        status: "completed",
      });
      await saveRecord("customers", { ...payTarget, outstanding: Math.max(0, payTarget.outstanding - amount) });
      toast({ type: "success", title: "Payment recorded", description: `${formatRs(amount)} collected from ${payTarget.name}.` });
      setPayTarget(null);
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to record payment", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Receivables"
        description="Money owed to you by customers on credit — follow up and collect."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Finance" }, { label: "Receivables" }]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Receivable" value={formatRs(totalReceivable)} icon={<HandCoins className="h-5 w-5" />} tone="warning" hint="Outstanding from customers" />
        <StatCard label="Customers Owing" value={String(debtors.length)} icon={<Users className="h-5 w-5" />} tone="info" hint="With open balances" />
        <StatCard label="Average Balance" value={formatRs(avgReceivable)} icon={<Sigma className="h-5 w-5" />} tone="navy" hint="Per customer" />
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by customer or phone…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto lg:w-56">
            <Select
              value={bucket}
              onChange={(e) => { setBucket(e.target.value); resetPage(); }}
              placeholder="All Risk Levels"
              options={[
                { value: "High", label: "High" },
                { value: "Medium", label: "Medium" },
                { value: "Low", label: "Low" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<HandCoins className="h-6 w-6" />}
              title="No receivables found"
              description="All customer balances are settled."
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
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Record payment"
        description={payTarget ? `Collect from ${payTarget.name} (outstanding ${formatRs(payTarget.outstanding)}).` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!form.amount}>Record Payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Amount (Rs)"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Select
            label="Method"
            value={form.method}
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
            options={[
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "bank", label: "Bank" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
