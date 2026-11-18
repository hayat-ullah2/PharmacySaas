"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, ShieldAlert, Pill, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/States";
import { useCart } from "@/lib/cart";
import { MEDICINES } from "@/lib/data";
import { sellableUnits } from "@/lib/units";
import { formatRs } from "@/lib/utils";
import { useToast } from "@/lib/toast";

export default function CartPage() {
  const { items, totals, updateQty, removeItem, changeUnit, saleType, clear } = useCart();
  const { toast } = useToast();

  if (items.length === 0) {
    return (
      <div>
        <PageHeader
          title="Your Cart"
          breadcrumbs={[{ label: "Store", href: "/manager/store" }, { label: "Cart" }]}
        />
        <Card>
          <EmptyState
            icon={<ShoppingCart className="h-6 w-6" />}
            title="Your cart is empty"
            description="Browse the store and add medicines to start a sale."
            action={<Link href="/manager/store"><Button><ArrowLeft className="h-4 w-4" /> Browse Store</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Your Cart"
        description={`${totals.count} item(s) ready for checkout`}
        breadcrumbs={[{ label: "Store", href: "/manager/store" }, { label: "Cart" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={saleType === "wholesale" ? "primary" : "navy"} className="capitalize">{saleType} sale</Badge>
            <Button variant="ghost" onClick={() => { clear(); toast({ type: "info", title: "Cart cleared" }); }}>
              <Trash2 className="h-4 w-4" /> Clear cart
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Items */}
        <Card className="lg:col-span-2">
          <CardHeader title="Cart Items" subtitle={`${items.length} product line(s)`} />
          <CardBody className="space-y-3">
            {items.map((item) => {
              const med = MEDICINES.find((m) => m.id === item.medicineId);
              const units = med ? sellableUnits(med) : [];
              // Keep the current unit selectable even if packaging changed since adding.
              if (!units.some((u) => u.name === item.unit)) {
                units.push({ name: item.unit, factor: item.factor, price: item.price });
              }
              const baseName = med?.unit ?? item.unit;
              return (
              <div key={item.key} className="flex items-center gap-3 rounded-xl border border-navy-100 p-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-300">
                  <Pill className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-navy-900">{item.name}</p>
                    {item.prescriptionRequired && <Badge tone="danger"><ShieldAlert className="h-3 w-3" /> Rx</Badge>}
                  </div>
                  <p className="text-xs text-navy-400">{item.genericName} · {item.strength}</p>
                  {units.length > 1 ? (
                    <div className="mt-1 w-44">
                      <Select
                        aria-label="Sell by unit"
                        className="h-8 text-xs"
                        value={item.unit}
                        onChange={(e) => {
                          const u = units.find((x) => x.name === e.target.value);
                          if (u) changeUnit(item.key, u);
                        }}
                        options={units.map((u) => ({
                          value: u.name,
                          label: u.factor > 1 ? `${u.name} — ${formatRs(u.price)} (${u.factor} ${baseName})` : `${u.name} — ${formatRs(u.price)}`,
                        }))}
                      />
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs font-medium text-primary-600">Per {item.unit}</p>
                  )}
                  <p className="mt-0.5 text-sm font-semibold text-navy-700 sm:hidden">{formatRs(item.price)}</p>
                </div>

                <p className="hidden w-24 text-right text-sm font-medium text-navy-700 sm:block">{formatRs(item.price)}</p>

                <div className="flex items-center rounded-lg border border-navy-200">
                  <button
                    onClick={() => updateQty(item.key, item.quantity - 1)}
                    aria-label="Decrease"
                    className="flex h-8 w-8 items-center justify-center text-navy-600 hover:bg-navy-50"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-navy-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.key, item.quantity + 1)}
                    aria-label="Increase"
                    className="flex h-8 w-8 items-center justify-center text-navy-600 hover:bg-navy-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="hidden w-24 text-right text-sm font-bold text-navy-900 sm:block">
                  {formatRs(item.price * item.quantity)}
                </p>

                <button
                  onClick={() => { removeItem(item.key); toast({ type: "info", title: "Removed", description: `${item.name} (${item.unit})` }); }}
                  aria-label={`Remove ${item.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-danger-50 hover:text-danger-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Order Summary" />
            <CardBody className="space-y-3">
              <SummaryRow label="Subtotal" value={formatRs(totals.subtotal)} />
              {totals.discount > 0 && <SummaryRow label="Discount" value={`- ${formatRs(totals.discount)}`} valueClass="text-success-600" />}
              {totals.tax > 0 && <SummaryRow label="Tax" value={formatRs(totals.tax)} />}
              <div className="border-t border-navy-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-navy-900">Grand Total</span>
                  <span className="text-xl font-bold text-navy-900">{formatRs(totals.total)}</span>
                </div>
              </div>
              <Link href="/manager/checkout" className="block">
                <Button size="lg" className="w-full">
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/manager/store" className="block">
                <Button variant="outline" className="w-full">Continue Shopping</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-navy-500">{label}</span>
      <span className={valueClass ?? "font-medium text-navy-800"}>{value}</span>
    </div>
  );
}
