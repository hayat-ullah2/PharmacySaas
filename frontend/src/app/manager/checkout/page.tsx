"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Landmark,
  MoreHorizontal,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  Pill,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { useCart } from "@/lib/cart";
import { CUSTOMERS, PRESCRIPTIONS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { useToast } from "@/lib/toast";
import { formatRs, cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank", label: "Bank Transfer", icon: Landmark },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totals, clear } = useCart();
  const { completeSale, saveRecord, lastSale, clearLastSale } = usePharmacyData();
  const { toast } = useToast();
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [processing, setProcessing] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const requiresRx = items.some((i) => i.prescriptionRequired);
  const done = Boolean(lastSale);
  const invoiceNo = lastSale?.invoice ?? "";

  // Payment math. For cash, a blank "received" means paid-in-full (the cashier
  // took the money); an explicit amount below the total makes it a credit sale.
  const isCash = payment === "cash";
  const hasReceived = isCash && amountReceived.trim() !== "";
  const received = hasReceived ? Number(amountReceived) || 0 : totals.total;
  const amountPaid = isCash ? Math.min(Math.max(received, 0), totals.total) : totals.total;
  const change = hasReceived ? Math.max(0, received - totals.total) : 0;
  const outstanding = Math.max(0, totals.total - amountPaid);
  const isCredit = outstanding > 0;
  const creditNeedsCustomer = isCredit && !customer;
  const paidLabel = outstanding <= 0 ? "Paid" : amountPaid <= 0 ? "Credit" : "Partial";

  if (items.length === 0 && !done) {
    return (
      <div>
        <PageHeader title="Checkout" breadcrumbs={[{ label: "Cart", href: "/manager/cart" }, { label: "Checkout" }]} />
        <Card>
          <EmptyState
            title="Nothing to checkout"
            description="Your cart is empty. Add medicines before checking out."
            action={<Link href="/manager/store"><Button><ArrowLeft className="h-4 w-4" /> Browse Store</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  const complete = async () => {
    setProcessing(true);
    try {
      await completeSale(items, customer || null, payment, prescriptionId || null, {
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
      }, amountPaid);
    } catch (saleError) {
      toast({
        type: "danger",
        title: saleError instanceof Error && saleError.message.startsWith("Sale ")
          ? "Sale completed; refresh failed"
          : "Unable to complete sale",
        description: saleError instanceof Error ? saleError.message : "Please review the cart and try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Checkout"
        description="Complete the sale and generate an invoice."
        breadcrumbs={[{ label: "Store", href: "/manager/store" }, { label: "Cart", href: "/manager/cart" }, { label: "Checkout" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Customer */}
          <Card>
            <CardHeader title="Customer" subtitle="Who is this sale for?" />
            <CardBody className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Select
                label="Select Customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Walk-in customer"
                options={CUSTOMERS.map((c) => ({ value: c.id, label: `${c.name}${c.phone !== "—" ? ` · ${c.phone}` : ""}` }))}
              />
              <Button variant="outline" onClick={() => setCustomerModalOpen(true)}>
                <UserPlus className="h-4 w-4" /> New Customer
              </Button>
            </CardBody>
          </Card>

          {/* Prescription */}
          {requiresRx && (
            <Card>
              <CardHeader
                title="Prescription"
                subtitle="One or more items require a prescription"
                action={<Badge tone="danger" dot><ShieldAlert className="h-3 w-3" /> Rx Required</Badge>}
              />
              <CardBody>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <Select
                      label="Or select existing"
                      value={prescriptionId}
                      onChange={(event) => setPrescriptionId(event.target.value)}
                      placeholder="Choose an approved prescription"
                      options={PRESCRIPTIONS
                        .filter((prescription) => prescription.status === "approved")
                        .map((prescription) => ({ value: prescription.id, label: `${prescription.code} · ${prescription.patient}` }))}
                    />
                    <p className="mt-2 text-xs text-navy-400">
                      A pharmacist must approve a prescription before prescription-only items can be sold.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Payment */}
          <Card>
            <CardHeader title="Payment Method" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = payment === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setPayment(m.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-4 transition",
                        active
                          ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100"
                          : "border-navy-200 bg-white text-navy-600 hover:border-navy-300 hover:bg-navy-50",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
              {payment === "cash" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Amount Received (Rs)"
                    type="number"
                    min={0}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={`${totals.total} (full)`}
                    hint="Leave blank for exact/full payment. Enter less than the total for a credit sale."
                  />
                  <Input label="Change" value={formatRs(change)} readOnly />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Order Summary" subtitle={`${totals.count} item(s)`} />
            <CardBody className="space-y-3">
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {items.map((i) => (
                  <div key={i.medicineId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-navy-600">
                      <span className="font-medium text-navy-800">{i.quantity}×</span> {i.name} {i.strength}
                    </span>
                    <span className="shrink-0 font-medium text-navy-800">{formatRs(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-navy-100 pt-3 text-sm">
                <Row label="Subtotal" value={formatRs(totals.subtotal)} />
                {totals.discount > 0 && <Row label="Discount" value={`- ${formatRs(totals.discount)}`} valueClass="text-success-600" />}
                {totals.tax > 0 && <Row label="Tax" value={formatRs(totals.tax)} />}
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 pt-3">
                <span className="text-base font-semibold text-navy-900">Total</span>
                <span className="text-xl font-bold text-navy-900">{formatRs(totals.total)}</span>
              </div>
              {isCredit && (
                <div className="space-y-2 rounded-lg bg-warning-50 p-3 text-sm">
                  <Row label="Paid now" value={formatRs(amountPaid)} />
                  <Row label="Outstanding (credit)" value={formatRs(outstanding)} valueClass="font-semibold text-warning-700" />
                </div>
              )}
              {creditNeedsCustomer && (
                <p className="text-xs font-medium text-warning-700">
                  Select a customer above to record the outstanding {formatRs(outstanding)} as credit.
                </p>
              )}
              <Button
                size="lg"
                className="w-full"
                loading={processing}
                disabled={(requiresRx && !prescriptionId) || creditNeedsCustomer}
                onClick={complete}
              >
                {isCredit ? `Complete ${paidLabel} Sale` : "Complete Sale"}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Success modal */}
      <Modal open={customerModalOpen} onClose={() => setCustomerModalOpen(false)} title="Add Customer" size="sm">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const id = crypto.randomUUID();
            try {
              await saveRecord("customers", {
                id,
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim(),
                email: newCustomerEmail.trim(),
                totalPurchases: 0,
                outstanding: 0,
                lastPurchase: "",
                status: "active",
                address: "",
              });
              setCustomer(id);
              setNewCustomerName("");
              setNewCustomerPhone("");
              setNewCustomerEmail("");
              setCustomerModalOpen(false);
            } catch (customerError) {
              toast({
                type: "danger",
                title: "Unable to save customer",
                description: customerError instanceof Error ? customerError.message : "Please try again.",
              });
            }
          }}
        >
          <Input label="Customer name" required value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} />
          <Input label="Phone" value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} />
          <Input label="Email" type="email" value={newCustomerEmail} onChange={(event) => setNewCustomerEmail(event.target.value)} />
          <Button type="submit" className="w-full">Save Customer</Button>
        </form>
      </Modal>

      <Modal open={done} onClose={() => {}} size="sm">
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-navy-900">Sale Completed</h2>
          <p className="mt-1 text-sm text-navy-500">
            Invoice <span className="font-semibold text-navy-700">{invoiceNo}</span> has been generated.
          </p>
          <p className="mt-4 text-3xl font-bold text-navy-900">{formatRs(totals.total)}</p>
          <Badge tone={outstanding <= 0 ? "success" : "warning"} className="mt-2 capitalize">{payment} · {paidLabel}</Badge>
          {outstanding > 0 && (
            <p className="mt-2 text-sm font-medium text-warning-700">{formatRs(outstanding)} recorded on credit.</p>
          )}

          <div className="mt-6 flex w-full flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => { clearLastSale(); clear(); router.push("/manager/sales"); }}
            >
              View Invoice
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { clearLastSale(); clear(); router.push("/manager/store"); }}
            >
              <Pill className="h-4 w-4" /> New Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-500">{label}</span>
      <span className={valueClass ?? "font-medium text-navy-800"}>{value}</span>
    </div>
  );
}
