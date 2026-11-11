"use client";

import { useMemo, useState } from "react";
import { CreditCard, Truck, Sigma, Wallet, MoreHorizontal } from "lucide-react";
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
import { SUPPLIERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Supplier, PaymentMethod } from "@/lib/types";

const PER_PAGE = 8;

// Balance-based risk tier (dummy data has only recent dates, so an amount tier
// is more meaningful — and honest — than a days-overdue label).
function riskTier(outstanding: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (outstanding >= 500000) return { label: "High", tone: "danger" };
  if (outstanding >= 250000) return { label: "Medium", tone: "warning" };
  return { label: "Low", tone: "success" };
}

export default function PayablesPage() {
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [payTarget, setPayTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ amount: "", method: "bank" });

  const resetPage = () => setPage(1);

  const creditors = useMemo(() => SUPPLIERS.filter((s) => s.outstanding > 0), []);

  const totalPayable = useMemo(() => creditors.reduce((s, x) => s + x.outstanding, 0), [creditors]);
  const avgPayable = creditors.length ? Math.round(totalPayable / creditors.length) : 0;

  const filtered = useMemo(() => {
    return creditors.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q);
      const matchBucket = !bucket || riskTier(s.outstanding).label === bucket;
      return matchSearch && matchBucket;
    });
  }, [creditors, search, bucket]);

  const paged = paginate(filtered, page, PER_PAGE);

  const openPay = (s: Supplier) => {
    setForm({ amount: String(s.outstanding), method: "bank" });
    setPayTarget(s);
  };

  const columns: Column<Supplier>[] = [
    { key: "name", header: "Supplier", render: (s) => <span className="font-medium text-navy-900">{s.name}</span> },
    {
      key: "contact",
      header: "Contact",
      hideOnMobile: true,
      render: (s) => (
        <div className="min-w-0">
          <p className="text-navy-700">{s.contactPerson}</p>
          <p className="text-xs text-navy-400">{s.phone}</p>
        </div>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (s) => <span className="font-semibold text-danger-600">{formatRs(s.outstanding)}</span>,
    },
    {
      key: "risk",
      header: "Risk",
      render: (s) => {
        const a = riskTier(s.outstanding);
        return <Badge tone={a.tone} dot>{a.label}</Badge>;
      },
    },
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
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
          items={[
            { label: "Pay Now", icon: <Wallet className="h-4 w-4" />, onClick: () => openPay(s) },
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
        type: "outgoing",
        amount,
        method: form.method as PaymentMethod,
        date: new Date().toISOString().slice(0, 10),
        status: "completed",
      });
      await saveRecord("suppliers", {
        ...payTarget,
        outstanding: Math.max(0, payTarget.outstanding - amount),
        paid: (payTarget.paid ?? 0) + amount,
      });
      toast({ type: "success", title: "Payment sent", description: `${formatRs(amount)} paid to ${payTarget.name}.` });
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
        title="Payables"
        description="Outstanding balances you owe to suppliers — stay on top of dues."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Finance" }, { label: "Payables" }]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Payable" value={formatRs(totalPayable)} icon={<CreditCard className="h-5 w-5" />} tone="danger" hint="Owed to suppliers" />
        <StatCard label="Suppliers Owed" value={String(creditors.length)} icon={<Truck className="h-5 w-5" />} tone="info" hint="With open balances" />
        <StatCard label="Average Balance" value={formatRs(avgPayable)} icon={<Sigma className="h-5 w-5" />} tone="navy" hint="Per supplier" />
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by supplier or contact…"
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
              icon={<CreditCard className="h-6 w-6" />}
              title="No payables found"
              description="All supplier balances are settled."
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
        title="Pay supplier"
        description={payTarget ? `Settle balance with ${payTarget.name} (outstanding ${formatRs(payTarget.outstanding)}).` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!form.amount}>Pay Now</Button>
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
