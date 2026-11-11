"use client";

import { useMemo, useState } from "react";
import { Plus, Undo2 } from "lucide-react";
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
import { PURCHASES, PURCHASE_RETURNS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { PurchaseReturn } from "@/lib/types";

export default function PurchaseReturnsPage() {
  const { toast } = useToast();
  const { recordPurchaseReturn } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poId, setPoId] = useState("");
  const [reason, setReason] = useState("");

  // Only received POs can be returned to a supplier.
  const returnablePOs = useMemo(() => [...PURCHASES].filter((p) => p.status === "received"), []);
  const selectedPO = useMemo(() => [...PURCHASES].find((p) => p.id === poId), [poId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...PURCHASE_RETURNS]
      .filter((r) => {
        const matchSearch = !q || r.poNumber.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q);
        const matchStatus = !status || r.status === status;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [search, status]);

  const submit = async () => {
    if (!poId) {
      toast({ type: "warning", title: "Select a purchase order", description: "Choose a received PO to return." });
      return;
    }
    setSaving(true);
    try {
      await recordPurchaseReturn(poId, reason.trim());
      toast({ type: "success", title: "Return recorded", description: "Stock was returned to the supplier and de-stocked." });
      setOpen(false);
      setPoId("");
      setReason("");
    } catch (returnError) {
      toast({ type: "danger", title: "Unable to record return", description: returnError instanceof Error ? returnError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<PurchaseReturn>[] = [
    { key: "poNumber", header: "PO Number", render: (r) => <span className="font-semibold text-navy-900">{r.poNumber}</span> },
    { key: "supplier", header: "Supplier", render: (r) => <span className="text-navy-700">{r.supplier}</span> },
    { key: "reason", header: "Reason", hideOnMobile: true, render: (r) => <span className="text-navy-600">{r.reason}</span> },
    { key: "amount", header: "Amount", align: "right", render: (r) => <span className="font-semibold text-navy-900">{formatRs(r.amount)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (r) => <span className="text-navy-500">{formatDate(r.date)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Returns"
        description="Return received goods to suppliers — returned stock is removed from inventory."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Purchases", href: "/admin/purchases" }, { label: "Returns" }]}
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
            placeholder="Search by PO number or supplier…"
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
              icon={<Undo2 className="h-6 w-6" />}
              title="No returns yet"
              description="Returns to suppliers will appear here."
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => { if (!saving) setOpen(false); }}
        title="New Purchase Return"
        description="Returns a received PO's goods to the supplier and removes the stock."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!poId}>Process Return</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Purchase Order"
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
            placeholder="Select a received purchase order"
            options={returnablePOs.map((p) => ({ value: p.id, label: `${p.poNumber} — ${p.supplier}` }))}
          />
          {selectedPO && (
            <div className="rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
              Return value: <span className="font-semibold text-navy-800">{formatRs(selectedPO.total)}</span> · {selectedPO.itemCount} line(s) will be de-stocked.
            </div>
          )}
          <Textarea
            label="Reason for return"
            rows={3}
            placeholder="Describe why the stock is being returned…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
