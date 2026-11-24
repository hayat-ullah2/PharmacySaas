"use client";

import { useMemo, useState } from "react";
import { Wallet, ArrowDownToLine, HandCoins, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { SALES, CASH_LEDGER } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { usePharmacyData, useLazyEntity } from "@/lib/pharmacyData";
import { formatRs, formatDate, pluralize } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { CashLedgerEntry } from "@/lib/types";

export default function ManagerLedgerPage() {
  useLazyEntity("cash_ledger");
  const { user } = useAuth();
  const { recordCashDeposit } = usePharmacyData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const myId = user?.id ?? "";

  // Cash I'm accountable for = cash actually collected on my sales.
  const collected = useMemo(
    () => SALES.filter((s) => s.cashierId === myId && s.payment === "cash").reduce((sum, s) => sum + (s.amountPaid ?? s.total), 0),
    [myId],
  );
  const myDeposits = useMemo(
    () => CASH_LEDGER.filter((e) => e.cashierId === myId).sort((a, b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date)),
    [myId],
  );
  const deposited = useMemo(() => myDeposits.reduce((sum, e) => sum + e.amount, 0), [myDeposits]);
  const inHand = collected - deposited;

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ type: "warning", title: "Enter an amount", description: "Deposit amount must be greater than 0." });
      return;
    }
    setSaving(true);
    try {
      await recordCashDeposit(amt, note.trim());
      toast({ type: "success", title: "Cash handed over", description: `${formatRs(amt)} recorded in the ledger.` });
      setOpen(false);
      setAmount("");
      setNote("");
    } catch (depositError) {
      toast({ type: "danger", title: "Unable to record deposit", description: depositError instanceof Error ? depositError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<CashLedgerEntry>[] = [
    { key: "date", header: "Date", render: (e) => <span className="text-navy-600">{formatDate(e.date)}</span> },
    { key: "amount", header: "Amount", align: "right", render: (e) => <span className="font-semibold text-navy-900">{formatRs(e.amount)}</span> },
    { key: "note", header: "Note", render: (e) => <span className="text-navy-500">{e.note || "—"}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Cash Ledger"
        description="Your cash collected, what you've handed over, and what's still in your drawer."
        breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "Cash Ledger" }]}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Hand over cash
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Cash Collected" value={formatRs(collected)} icon={<Wallet className="h-5 w-5" />} tone="primary" hint="From your cash sales" />
        <StatCard label="Deposited" value={formatRs(deposited)} icon={<ArrowDownToLine className="h-5 w-5" />} tone="success" hint="Handed over to owner" />
        <StatCard label="In Your Drawer" value={formatRs(inHand)} icon={<HandCoins className="h-5 w-5" />} tone={inHand > 0 ? "warning" : "navy"} hint="Collected − deposited" />
      </div>

      <Card className="mt-5">
        <CardHeader title="My hand-overs" subtitle={pluralize(myDeposits.length, "deposit")} />
        <DataTable
          columns={columns}
          rows={myDeposits}
          empty={
            <EmptyState
              icon={<HandCoins className="h-6 w-6" />}
              title="No deposits yet"
              description="When you hand over cash, it appears here and the owner can see it."
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => { if (!saving) setOpen(false); }}
        title="Hand over cash"
        description="Record cash you're depositing / handing to the owner. This is visible to you and the owner."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button loading={saving} disabled={!(Number(amount) > 0)} onClick={submit}>Record Deposit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Amount (Rs)" type="number" min={1} step="0.01" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} hint={`You have ${formatRs(inHand)} in your drawer.`} />
          <Textarea label="Note (optional)" rows={2} placeholder="e.g. End-of-shift hand-over" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
