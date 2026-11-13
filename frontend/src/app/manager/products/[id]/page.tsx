"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pill, Minus, Plus, ShoppingCart, ArrowLeft, ShieldAlert, Check, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MEDICINES, BATCHES } from "@/lib/data";
import { formatRs, formatDate } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { sellableUnits, baseUnit } from "@/lib/units";
import { useToast } from "@/lib/toast";
import type { Batch } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [unitName, setUnitName] = useState("");

  const medicine = MEDICINES.find((m) => m.id === params.id);

  if (!medicine) {
    return (
      <div>
        <Card>
          <EmptyState
            icon={<Pill className="h-6 w-6" />}
            title="Product not found"
            description="This medicine is not available in the store."
            action={<Link href="/manager/store"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Store</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  const batches = BATCHES.filter((b) => b.medicineId === medicine.id);
  const outOfStock = medicine.stock <= 0;
  const units = sellableUnits(medicine);
  const selectedUnit = units.find((u) => u.name === unitName) ?? units[units.length - 1] ?? baseUnit(medicine);
  const maxQty = Math.max(1, Math.floor(medicine.stock / selectedUnit.factor));

  const add = () => {
    if (outOfStock) return;
    addItem(medicine, selectedUnit, qty);
    setAdded(true);
    toast({ type: "success", title: "Added to cart", description: `${qty} ${selectedUnit.name} · ${medicine.name}` });
    setTimeout(() => setAdded(false), 1500);
  };

  const batchColumns: Column<Batch>[] = [
    { key: "batchNumber", header: "Batch", render: (b) => <span className="font-medium text-navy-900">{b.batchNumber}</span> },
    { key: "expiryDate", header: "Expiry", render: (b) => formatDate(b.expiryDate) },
    { key: "remaining", header: "Available", align: "center", render: (b) => b.remaining },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumbs
          items={[
            { label: "Store", href: "/manager/store" },
            { label: medicine.category, href: "/manager/store" },
            { label: medicine.name },
          ]}
        />
        <Link href="/manager/store" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Image */}
        <Card>
          <CardBody>
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary-50 to-navy-50">
              {medicine.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={medicine.image} alt={medicine.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Pill className="h-28 w-28 text-primary-200" />
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-navy-50 p-2.5">
                <ShieldCheck className="mx-auto h-4 w-4 text-success-600" />
                <p className="mt-1 text-[11px] text-navy-500">Genuine</p>
              </div>
              <div className="rounded-lg bg-navy-50 p-2.5">
                <Truck className="mx-auto h-4 w-4 text-primary-600" />
                <p className="mt-1 text-[11px] text-navy-500">In-store</p>
              </div>
              <div className="rounded-lg bg-navy-50 p-2.5">
                <RotateCcw className="mx-auto h-4 w-4 text-info-600" />
                <p className="mt-1 text-[11px] text-navy-500">Returnable</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Info + purchase */}
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{medicine.category}</Badge>
                {medicine.prescriptionRequired ? (
                  <Badge tone="danger" dot><ShieldAlert className="h-3 w-3" /> Rx Required</Badge>
                ) : (
                  <Badge tone="success" dot>OTC</Badge>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold text-navy-900">{medicine.name}</h1>
              <p className="text-navy-500">{medicine.genericName} · {medicine.strength} · {medicine.dosageForm}</p>

              <div className="mt-4 flex items-end gap-3">
                <span className="text-3xl font-bold text-navy-900">{formatRs(selectedUnit.price)}</span>
                <span className="mb-1 text-sm text-navy-400">per {selectedUnit.name.toLowerCase()}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={medicine.status} />
                <span className="text-sm text-navy-500">
                  {outOfStock ? "Currently unavailable" : `${maxQty} ${selectedUnit.name} available`}
                </span>
              </div>

              {units.length > 1 && (
                <div className="mt-4 max-w-[15rem]">
                  <Select
                    label="Sell by unit"
                    value={selectedUnit.name}
                    onChange={(e) => { setUnitName(e.target.value); setQty(1); }}
                    options={units.map((u) => ({ value: u.name, label: `${u.name} — ${formatRs(u.price)}${u.factor > 1 ? ` (${u.factor} ${medicine.unit})` : ""}` }))}
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center rounded-lg border border-navy-200">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={outOfStock}
                    aria-label="Decrease quantity"
                    className="flex h-11 w-11 items-center justify-center text-navy-600 transition hover:bg-navy-50 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold text-navy-900">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={outOfStock}
                    aria-label="Increase quantity"
                    className="flex h-11 w-11 items-center justify-center text-navy-600 transition hover:bg-navy-50 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button size="lg" className="flex-1" onClick={add} disabled={outOfStock}>
                  {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  {added ? "Added to cart" : outOfStock ? "Out of stock" : `Add to Cart · ${formatRs(selectedUnit.price * qty)}`}
                </Button>
              </div>

              {medicine.prescriptionRequired && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-xs text-danger-700">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  A valid prescription is required to dispense this medicine at checkout.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Batch Information" subtitle={`Nearest expiry ${formatDate(medicine.expiry)}`} />
            <CardBody className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-navy-50 p-3">
                <p className="text-xs text-navy-400">Primary Batch</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-800">{batches[0]?.batchNumber ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-navy-50 p-3">
                <p className="text-xs text-navy-400">Expiry</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-800">{formatDate(medicine.expiry)}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Description + batches */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Description & Usage Information" />
          <CardBody>
            <p className="text-sm leading-relaxed text-navy-600">{medicine.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-navy-600">
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success-600" /> Store below 30°C in a dry place, away from direct sunlight.</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success-600" /> Keep out of reach of children.</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success-600" /> Follow the dosage advised by your physician or pharmacist.</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Available Batches" />
          <DataTable columns={batchColumns} rows={batches} empty={<EmptyState title="No batches" />} />
        </Card>
      </div>
    </div>
  );
}
