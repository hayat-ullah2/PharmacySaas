"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale, Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { PAYMENTS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Payment, PaymentMethod } from "@/lib/types";

const PER_PAGE = 8;

export default function PaymentsPage() {
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ party: "", amount: "", type: "incoming", method: "cash" });

  const resetPage = () => setPage(1);

  const totals = useMemo(() => {
    const received = PAYMENTS.filter((p) => p.type === "incoming").reduce((s, p) => s + p.amount, 0);
    const paidOut = PAYMENTS.filter((p) => p.type === "outgoing").reduce((s, p) => s + p.amount, 0);
    return { received, paidOut, net: received - paidOut };
  }, []);

  const filtered = useMemo(() => {
    return PAYMENTS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.reference.toLowerCase().includes(q) ||
        p.party.toLowerCase().includes(q);
      const matchType = !type || p.type === type;
      const matchMethod = !method || p.method === method;
      return matchSearch && matchType && matchMethod;
    });
  }, [search, type, method]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Payment>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (p) => <span className="font-semibold text-navy-900">{p.reference}</span>,
    },
    { key: "party", header: "Party", render: (p) => <span className="text-navy-700">{p.party}</span> },
    {
      key: "type",
      header: "Type",
      render: (p) => (
        <Badge tone={p.type === "incoming" ? "success" : "warning"}>
          <span className="capitalize">{p.type}</span>
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (p) => <span className="font-semibold text-navy-900">{formatRs(p.amount)}</span>,
    },
    {
      key: "method",
      header: "Method",
      hideOnMobile: true,
      render: (p) => <span className="capitalize text-navy-600">{p.method}</span>,
    },
    {
      key: "date",
      header: "Date",
      align: "right",
      hideOnMobile: true,
      render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span>,
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  const submit = async () => {
    const amount = Number(form.amount);
    if (!form.party.trim()) {
      toast({ type: "warning", title: "Party required", description: "Enter the customer or supplier name." });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ type: "warning", title: "Invalid amount", description: "Enter an amount greater than zero." });
      return;
    }
    setSaving(true);
    try {
      await saveRecord("payments", {
        id: crypto.randomUUID(),
        reference: `PMT-${Date.now().toString().slice(-6)}`,
        party: form.party.trim(),
        type: form.type as Payment["type"],
        amount,
        method: form.method as PaymentMethod,
        date: new Date().toISOString().slice(0, 10),
        status: "completed",
      });
      toast({ type: "success", title: "Payment recorded", description: `${form.type === "incoming" ? "Received from" : "Paid to"} ${form.party.trim()} — ${formatRs(amount)}.` });
      setRecordOpen(false);
      setForm({ party: "", amount: "", type: "incoming", method: "cash" });
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to record payment", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Track incoming receipts and outgoing settlements across the pharmacy."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Finance" }, { label: "Payments" }]}
        actions={
          <Button onClick={() => setRecordOpen(true)}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Received" value={formatRs(totals.received)} icon={<ArrowDownLeft className="h-5 w-5" />} tone="success" hint="Incoming payments" />
        <StatCard label="Total Paid Out" value={formatRs(totals.paidOut)} icon={<ArrowUpRight className="h-5 w-5" />} tone="warning" hint="Outgoing payments" />
        <StatCard label="Net Position" value={formatRs(totals.net)} icon={<Scale className="h-5 w-5" />} tone={totals.net >= 0 ? "primary" : "danger"} hint="Received − paid out" />
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by reference or party…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
            <Select
              value={type}
              onChange={(e) => { setType(e.target.value); resetPage(); }}
              placeholder="All Types"
              options={[
                { value: "incoming", label: "Incoming" },
                { value: "outgoing", label: "Outgoing" },
              ]}
            />
            <Select
              value={method}
              onChange={(e) => { setMethod(e.target.value); resetPage(); }}
              placeholder="All Methods"
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "bank", label: "Bank" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title="No payments found"
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
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record payment"
        description="Log an incoming or outgoing payment."
        footer={
          <>
            <Button variant="outline" onClick={() => setRecordOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!form.party.trim() || !form.amount}>Save Payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Party"
            placeholder="Customer or supplier name"
            value={form.party}
            onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))}
          />
          <Input
            label="Amount (Rs)"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              options={[
                { value: "incoming", label: "Incoming" },
                { value: "outgoing", label: "Outgoing" },
              ]}
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
        </div>
      </Modal>
    </div>
  );
}
