"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Plus, Trash2, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SUPPLIERS, MEDICINES } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs } from "@/lib/utils";
import { useToast } from "@/lib/toast";

interface LineItem {
  id: string;
  medicineId: string;
  medicineName: string;
  batch: string;
  quantity: number;
  purchasePrice: number;
  expiryDate: string;
}

let counter = 0;
const newLine = (): LineItem => ({
  id: `line-${++counter}`,
  medicineId: "",
  medicineName: "",
  batch: "",
  quantity: 1,
  purchasePrice: 0,
  expiryDate: "",
});

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();

  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [taxPct, setTaxPct] = useState("");
  const [discount, setDiscount] = useState("");
  const [saving, setSaving] = useState(false);

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, newLine()]);

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));

  // When a medicine is picked, store its id/name and prefill its purchase price.
  const onSelectMedicine = (id: string, medicineId: string) => {
    const med = [...MEDICINES].find((m) => m.id === medicineId);
    updateItem(id, {
      medicineId,
      medicineName: med ? `${med.name} ${med.strength}` : "",
      purchasePrice: med ? med.purchasePrice : 0,
    });
  };

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.purchasePrice, 0),
    [items],
  );

  const taxAmount = useMemo(() => {
    const pct = parseFloat(taxPct) || 0;
    return Math.round((subtotal * pct) / 100);
  }, [subtotal, taxPct]);

  const discountAmount = useMemo(() => parseFloat(discount) || 0, [discount]);

  const total = useMemo(
    () => Math.max(0, subtotal + taxAmount - discountAmount),
    [subtotal, taxAmount, discountAmount],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) {
      toast({ type: "warning", title: "Supplier required", description: "Choose a supplier for this order." });
      return;
    }
    const validItems = items.filter((it) => it.medicineId && it.quantity > 0 && it.expiryDate);
    if (validItems.length === 0) {
      toast({ type: "warning", title: "Add a product", description: "Each line needs a medicine, quantity, and expiry date." });
      return;
    }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await saveRecord("purchases", {
        id,
        poNumber: `PO-${Date.now().toString().slice(-6)}`,
        supplier,
        items: validItems.map((it) => ({
          medicineId: it.medicineId,
          medicineName: it.medicineName,
          batch: it.batch.trim(),
          quantity: it.quantity,
          purchasePrice: it.purchasePrice,
          expiryDate: it.expiryDate,
        })),
        itemCount: validItems.length,
        total,
        status: "ordered",
        date: purchaseDate || new Date().toISOString().slice(0, 10),
        expectedDate: expectedDate || "",
      });
      toast({ type: "success", title: "Purchase order created", description: `PO for ${supplier} saved. Receive it to add stock.` });
      router.push("/admin/purchases");
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save order", description: saveError instanceof Error ? saveError.message : "Please try again." });
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Purchase Order"
        description="Raise a purchase order and add the products you want to stock."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Purchases", href: "/admin/purchases" },
          { label: "New Purchase Order" },
        ]}
      />

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Order Details" subtitle="Supplier and expected dates" />
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Select supplier"
                options={SUPPLIERS.map((s) => ({ value: s.name, label: s.name }))}
                className="sm:col-span-3"
              />
              <Input label="Purchase Date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              <Input label="Expected Date" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Products"
              subtitle={`${items.length} line item(s)`}
              action={
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              }
            />
            <CardBody className="space-y-4">
              {items.map((it, idx) => {
                const lineTotal = it.quantity * it.purchasePrice;
                return (
                  <div key={it.id} className="rounded-xl border border-navy-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                        Item {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        disabled={items.length === 1}
                        aria-label="Remove item"
                        className="rounded-lg p-1.5 text-navy-400 transition hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <Select
                        label="Medicine"
                        value={it.medicineId}
                        onChange={(e) => onSelectMedicine(it.id, e.target.value)}
                        placeholder="Select medicine"
                        options={[...MEDICINES].map((m) => ({ value: m.id, label: `${m.name} ${m.strength}` }))}
                      />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Input
                          label="Batch"
                          placeholder="e.g. PAN-2026-09"
                          value={it.batch}
                          onChange={(e) => updateItem(it.id, { batch: e.target.value })}
                        />
                        <Input
                          label="Qty"
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => updateItem(it.id, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                        <Input
                          label="Purchase Price"
                          type="number"
                          min={0}
                          value={it.purchasePrice}
                          onChange={(e) => updateItem(it.id, { purchasePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        />
                        <Input
                          label="Expiry"
                          type="date"
                          value={it.expiryDate}
                          onChange={(e) => updateItem(it.id, { expiryDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end text-sm">
                      <span className="text-navy-500">Line subtotal:&nbsp;</span>
                      <span className="font-semibold text-navy-900">{formatRs(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Summary" subtitle="Front-end calculated totals" />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Tax (%)"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={taxPct}
                  onChange={(e) => setTaxPct(e.target.value)}
                />
                <Input
                  label="Discount (Rs)"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <dl className="space-y-2 border-t border-navy-100 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-navy-500">Subtotal</dt>
                  <dd className="font-medium text-navy-800">{formatRs(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-navy-500">Tax{taxPct ? ` (${taxPct}%)` : ""}</dt>
                  <dd className="font-medium text-navy-800">{formatRs(taxAmount)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-navy-500">Discount</dt>
                  <dd className="font-medium text-danger-600">− {formatRs(discountAmount)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-navy-200 pt-2">
                  <dt className="text-base font-semibold text-navy-900">Total</dt>
                  <dd className="text-base font-bold text-navy-900">{formatRs(total)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-2">
              <div className="mb-1 flex items-center gap-3 rounded-xl bg-primary-50 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <Package className="h-5 w-5" />
                </span>
                <p className="text-xs text-navy-600">
                  Receiving this order (from its detail page) adds stock and creates batches automatically.
                </p>
              </div>
              <Button type="submit" loading={saving} className="w-full">
                <Save className="h-4 w-4" /> Save Purchase Order
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/admin/purchases")}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}
