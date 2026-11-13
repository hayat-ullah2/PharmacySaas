"use client";

import { useMemo, useState } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { SALES, SALES_RETURNS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { SalesReturn } from "@/lib/types";

export default function ManagerReturnsPage() {
  const { toast } = useToast();
  const { recordSaleReturn } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});

  const returnableSales = useMemo(() => [...SALES].filter((s) => s.status !== "refunded"), []);
  const selectedSale = useMemo(() => [...SALES].find((s) => s.id === saleId), [saleId]);

  const selectSale = (id: string) => { setSaleId(id); setReturnQty({}); };
  const setItemQty = (medicineId: string, max: number, value: number) =>
    setReturnQty((cur) => ({ ...cur, [medicineId]: Math.max(0, Math.min(max, value)) }));

  // Refund is proportional to the sale total, so any discount is respected.
  const ratio = selectedSale && selectedSale.subtotal > 0 ? selectedSale.total / selectedSale.subtotal : 1;
  const refund = selectedSale
    ? selectedSale.items.reduce((sum, it) => (it.medicineId ? sum + it.price * (returnQty[it.medicineId] ?? 0) * ratio : sum), 0)
    : 0;
  const totalReturnQty = Object.values(returnQty).reduce((a, b) => a + b, 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...SALES_RETURNS]
      .filter((r) => {
        const matchSearch = !q || r.invoice.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q);
        const matchStatus = !status || r.status === status;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [search, status]);

  const submit = async () => {
    if (!saleId || !selectedSale) {
      toast({ type: "warning", title: "Select an invoice", description: "Choose the sale to return against." });
      return;
    }
    const items = selectedSale.items
      .filter((it) => it.medicineId && (returnQty[it.medicineId] ?? 0) > 0)
      .map((it) => ({ medicineId: it.medicineId as string, quantity: returnQty[it.medicineId as string] }));
    if (items.length === 0) {
      toast({ type: "warning", title: "Nothing selected", description: "Enter the quantity to return for at least one item." });
      return;
    }
    setSaving(true);
    try {
      await recordSaleReturn(saleId, items, reason.trim());
      toast({ type: "success", title: "Return processed", description: `${formatRs(Math.round(refund))} refunded · items restocked.` });
      setOpen(false);
      setSaleId("");
      setReason("");
      setReturnQty({});
    } catch (returnError) {
      toast({ type: "danger", title: "Unable to process return", description: returnError instanceof Error ? returnError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<SalesReturn>[] = [
    { key: "invoice", header: "Invoice", render: (r) => <span className="font-semibold text-navy-900">{r.invoice}</span> },
    { key: "customer", header: "Customer", render: (r) => <span className="text-navy-700">{r.customer}</span> },
    { key: "reason", header: "Reason", hideOnMobile: true, render: (r) => <span className="text-navy-500">{r.reason}</span> },
    { key: "amount", header: "Amount", align: "right", render: (r) => <span className="font-bold text-navy-900">{formatRs(r.amount)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (r) => <span className="text-navy-500">{formatDate(r.date)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Returns"
        description="Process customer returns — returned items are restocked automatically."
        breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "Selling" }, { label: "Returns" }]}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Return
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by invoice or customer…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="All Status"
              options={[
                { value: "approved", label: "Approved" },
                { value: "pending", label: "Pending" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          empty={
            <EmptyState
              icon={<RotateCcw className="h-6 w-6" />}
              title="No returns yet"
              description="Processed returns will appear here."
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => { if (!saving) setOpen(false); }}
        title="New Return"
        description="Choose the items and quantities to return — they'll be restocked and refunded."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!saleId || totalReturnQty === 0}>Process Return</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Invoice"
            value={saleId}
            onChange={(e) => selectSale(e.target.value)}
            placeholder="Select a sale"
            options={returnableSales.map((s) => ({ value: s.id, label: `${s.invoice} — ${s.customer}` }))}
          />

          {selectedSale && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-700">Items to return</p>
              <div className="space-y-2">
                {selectedSale.items.map((it, idx) => {
                  const mid = it.medicineId;
                  const already = it.returnedQty ?? 0;
                  const returnable = it.quantity - already;
                  const qty = mid ? (returnQty[mid] ?? 0) : 0;
                  return (
                    <div key={mid ?? idx} className="flex items-center justify-between gap-3 rounded-lg border border-navy-100 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy-800">{it.medicineName}</p>
                        <p className="text-xs text-navy-400">
                          Sold {it.quantity}{already > 0 ? ` · ${already} returned` : ""} · {formatRs(it.price)} each
                        </p>
                      </div>
                      {mid && returnable > 0 ? (
                        <div className="flex shrink-0 items-center rounded-lg border border-navy-200">
                          <button type="button" aria-label="Decrease" onClick={() => setItemQty(mid, returnable, qty - 1)} className="flex h-8 w-8 items-center justify-center text-navy-600 transition hover:bg-navy-50">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-9 text-center text-sm font-semibold text-navy-900">{qty}<span className="text-[10px] font-normal text-navy-400">/{returnable}</span></span>
                          <button type="button" aria-label="Increase" onClick={() => setItemQty(mid, returnable, qty + 1)} className="flex h-8 w-8 items-center justify-center text-navy-600 transition hover:bg-navy-50">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-navy-400">{mid ? "Fully returned" : "—"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg bg-navy-50 p-3 text-sm">
                <div className="flex justify-between"><span className="text-navy-500">Units to return</span><span className="font-medium text-navy-800">{totalReturnQty}</span></div>
                <div className="mt-1 flex justify-between"><span className="text-navy-500">Refund amount</span><span className="font-bold text-navy-900">{formatRs(Math.round(refund))}</span></div>
              </div>
            </div>
          )}

          <Textarea
            label="Reason for return"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why the item is being returned…"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
