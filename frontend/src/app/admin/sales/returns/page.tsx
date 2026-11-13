"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
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

export default function SalesReturnsPage() {
  const { toast } = useToast();
  const { recordSaleReturn } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");

  const returnableSales = useMemo(() => [...SALES].filter((s) => s.status !== "refunded"), []);
  const selectedSale = useMemo(() => [...SALES].find((s) => s.id === saleId), [saleId]);

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
    // Admin return processes all remaining (not-yet-returned) items of the sale.
    const items = selectedSale.items
      .map((it) => ({ medicineId: it.medicineId as string, quantity: it.quantity - (it.returnedQty ?? 0) }))
      .filter((it) => it.medicineId && it.quantity > 0);
    if (items.length === 0) {
      toast({ type: "warning", title: "Nothing to return", description: "This sale has no remaining returnable items." });
      return;
    }
    setSaving(true);
    try {
      await recordSaleReturn(saleId, items, reason.trim());
      toast({ type: "success", title: "Return processed", description: "Items restocked and the sale was refunded." });
      setOpen(false);
      setSaleId("");
      setReason("");
    } catch (returnError) {
      toast({ type: "danger", title: "Unable to process return", description: returnError instanceof Error ? returnError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<SalesReturn>[] = [
    { key: "invoice", header: "Invoice", render: (r) => <span className="font-semibold text-navy-900">{r.invoice}</span> },
    { key: "customer", header: "Customer", render: (r) => <span className="text-navy-700">{r.customer}</span> },
    { key: "reason", header: "Reason", hideOnMobile: true, render: (r) => <span className="text-navy-600">{r.reason}</span> },
    { key: "amount", header: "Amount", align: "right", render: (r) => <span className="font-semibold text-navy-900">{formatRs(r.amount)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (r) => <span className="text-navy-500">{formatDate(r.date)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Returns"
        description="Process returns against completed sales — returned items are restocked."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Sales", href: "/admin/sales" }, { label: "Returns" }]}
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
        title="New Sales Return"
        description="Returns the full sale: items are restocked and the invoice is refunded."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!saleId}>Process Return</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Original Invoice"
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
            placeholder="Select a sale"
            options={returnableSales.map((s) => ({ value: s.id, label: `${s.invoice} — ${s.customer}` }))}
          />
          {selectedSale && (
            <div className="rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
              Refund amount: <span className="font-semibold text-navy-800">{formatRs(selectedSale.total)}</span> · {selectedSale.itemCount} item(s) will be restocked.
            </div>
          )}
          <Textarea
            label="Reason for return"
            rows={3}
            placeholder="Describe why the items are being returned…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
