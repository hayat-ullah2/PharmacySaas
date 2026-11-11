"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Plus, Receipt, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { SALES } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { formatRs, formatDate } from "@/lib/utils";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ManagerSaleDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const sale = SALES.find((s) => s.id === params.id);

  if (!sale) {
    return (
      <div>
        <PageHeader
          title="Sale not found"
          breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "Sales", href: "/manager/sales" }, { label: "Not found" }]}
        />
        <Card>
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Invoice not found"
            description="The sale you are looking for does not exist."
            action={
              <Link href="/manager/sales">
                <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Sales</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const pharmacyName = user?.pharmacyName?.trim() || "Pharmacy";
  const pharmacyContact = [user?.pharmacyAddress, user?.pharmacyPhone].filter((v) => v && v.trim()).join(" · ");

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={`Invoice ${sale.invoice}`}
          description={`${sale.customer} · ${formatDate(sale.date)}`}
          breadcrumbs={[
            { label: "Home", href: "/manager" },
            { label: "Sales", href: "/manager/sales" },
            { label: sale.invoice },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
              <Link href="/manager/store">
                <Button>
                  <Plus className="h-4 w-4" /> New Sale
                </Button>
              </Link>
            </>
          }
        />

        <div className="mb-4">
          <Link href="/manager/sales" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
            <ArrowLeft className="h-4 w-4" /> Back to Sales
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card className="pos-receipt">
          <CardBody className="sm:p-8">
            {/* Receipt header */}
            <div className="flex flex-col items-center border-b border-dashed border-navy-200 pb-5 text-center">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-primary-600 text-white">
                {user?.pharmacyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.pharmacyLogo} alt={pharmacyName} className="h-full w-full object-cover" />
                ) : (
                  <Pill className="h-6 w-6" />
                )}
              </span>
              <h2 className="mt-3 text-xl font-bold text-navy-900">{pharmacyName}</h2>
              {pharmacyContact && <p className="mt-0.5 text-xs text-navy-400">{pharmacyContact}</p>}
              <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-navy-500">Sales Receipt</p>
            </div>

            {/* Meta */}
            <dl className="grid grid-cols-2 gap-y-3 py-5 text-sm">
              <dt className="text-navy-400">Invoice No.</dt>
              <dd className="text-right font-semibold text-navy-900">{sale.invoice}</dd>
              <dt className="text-navy-400">Date</dt>
              <dd className="text-right font-medium text-navy-800">{formatDate(sale.date)}</dd>
              <dt className="text-navy-400">Customer</dt>
              <dd className="text-right font-medium text-navy-800">{sale.customer}</dd>
              <dt className="text-navy-400">Payment</dt>
              <dd className="text-right font-medium text-navy-800">{capitalize(sale.payment)}</dd>
              <dt className="text-navy-400">Status</dt>
              <dd className="flex justify-end"><StatusBadge status={sale.status} /></dd>
            </dl>

            {/* Items */}
            <div className="overflow-x-auto border-y border-dashed border-navy-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-navy-400">
                    <th className="py-2 text-left font-medium">Item</th>
                    <th className="py-2 text-center font-medium">Qty</th>
                    <th className="py-2 text-right font-medium">Price</th>
                    <th className="py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {sale.items.map((item, i) => (
                    <tr key={`${item.medicineName}-${i}`}>
                      <td className="py-2.5 pr-2 font-medium text-navy-800">{item.medicineName}</td>
                      <td className="py-2.5 text-center text-navy-600">{item.quantity}</td>
                      <td className="py-2.5 text-right text-navy-600">{formatRs(item.price)}</td>
                      <td className="py-2.5 text-right font-medium text-navy-900">{formatRs(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="ml-auto mt-5 w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-navy-500">
                <span>Subtotal</span>
                <span className="font-medium text-navy-800">{formatRs(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-navy-500">
                <span>Discount</span>
                <span className="font-medium text-navy-800">- {formatRs(sale.discount)}</span>
              </div>
              <div className="flex justify-between text-navy-500">
                <span>Tax</span>
                <span className="font-medium text-navy-800">{formatRs(sale.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-navy-200 pt-2 text-base">
                <span className="font-semibold text-navy-900">Total</span>
                <span className="font-bold text-navy-900">{formatRs(sale.total)}</span>
              </div>
            </div>

            <p className="mt-8 border-t border-dashed border-navy-200 pt-5 text-center text-xs text-navy-400">
              Thank you for shopping at {pharmacyName}. Get well soon!
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
