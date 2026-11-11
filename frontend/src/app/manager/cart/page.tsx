"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, ShieldAlert, Pill, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { useCart } from "@/lib/cart";
import { formatRs } from "@/lib/utils";
import { useToast } from "@/lib/toast";

export default function CartPage() {
  const { items, totals, updateQty, removeItem, clear } = useCart();
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
          <Button variant="ghost" onClick={() => { clear(); toast({ type: "info", title: "Cart cleared" }); }}>
            <Trash2 className="h-4 w-4" /> Clear cart
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Items */}
        <Card className="lg:col-span-2">
          <CardHeader title="Cart Items" subtitle={`${items.length} product line(s)`} />
          <CardBody className="space-y-3">
            {items.map((item) => (
              <div key={item.medicineId} className="flex items-center gap-3 rounded-xl border border-navy-100 p-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-300">
                  <Pill className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-navy-900">{item.name}</p>
                    {item.prescriptionRequired && <Badge tone="danger"><ShieldAlert className="h-3 w-3" /> Rx</Badge>}
                  </div>
                  <p className="text-xs text-navy-400">{item.genericName} · {item.strength}</p>
                  <p className="mt-0.5 text-sm font-semibold text-navy-700 sm:hidden">{formatRs(item.price)}</p>
                </div>

                <p className="hidden w-24 text-right text-sm font-medium text-navy-700 sm:block">{formatRs(item.price)}</p>

                <div className="flex items-center rounded-lg border border-navy-200">
                  <button
                    onClick={() => updateQty(item.medicineId, item.quantity - 1)}
                    aria-label="Decrease"
                    className="flex h-8 w-8 items-center justify-center text-navy-600 hover:bg-navy-50"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-navy-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.medicineId, item.quantity + 1)}
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
                  onClick={() => { removeItem(item.medicineId); toast({ type: "info", title: "Removed", description: item.name }); }}
                  aria-label={`Remove ${item.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-danger-50 hover:text-danger-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Order Summary" />
            <CardBody className="space-y-3">
              <SummaryRow label="Subtotal" value={formatRs(totals.subtotal)} />
              <SummaryRow label="Discount (5%)" value={`- ${formatRs(totals.discount)}`} valueClass="text-success-600" />
              <SummaryRow label="Tax" value={formatRs(totals.tax)} />
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
