"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Receipt, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { SALES, CUSTOMERS } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { formatRs, formatDate } from "@/lib/utils";
import { cldThumb } from "@/lib/img";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const sale = SALES.find((s) => s.id === params.id);

  if (!sale) {
    return (
      <div>
        <PageHeader
          title="Sale not found"
          breadcrumbs={[
            { label: "Home", href: "/admin/dashboard" },
            { label: "Sales", href: "/admin/sales" },
            { label: "Not found" },
          ]}
        />
        <Card>
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Sale not found"
            description="The invoice you are looking for does not exist."
            action={
              <Link href="/admin/sales">
                <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Sales</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const customer = CUSTOMERS.find((c) => c.name === sale.customer);
  // Pharmacy identity for the invoice header — tenant-specific, from the signed-in
  // pharmacy profile (never hardcoded).
  const pharmacyName = user?.pharmacyName?.trim() || "Pharmacy";
  const pharmacyAddress = user?.pharmacyAddress?.trim();
  const pharmacyPhone = user?.pharmacyPhone?.trim();

  return (
    <div>
      <PageHeader
        title={sale.invoice}
        description={`Invoice for ${sale.customer} · ${formatDate(sale.date)}`}
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Sales", href: "/admin/sales" },
          { label: sale.invoice },
        ]}
        actions={
          <>
            <Link href="/admin/sales">
              <Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Back</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              onClick={() => window.print()}
            >
              <Download className="h-4 w-4" /> Save as PDF
            </Button>
          </>
        }
      />

      <Card className="mx-auto max-w-3xl">
        <CardBody className="space-y-6 p-6 sm:p-8">
          {/* Invoice header */}
          <div className="flex flex-col justify-between gap-4 border-b border-navy-100 pb-6 sm:flex-row sm:items-start">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-primary-600 text-white">
                {user?.pharmacyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cldThumb(user.pharmacyLogo, { w: 96, h: 96 })} alt={pharmacyName} decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <Pill className="h-6 w-6" />
                )}
              </span>
              <div>
                <p className="text-lg font-bold text-navy-900">{pharmacyName}</p>
                {pharmacyAddress && <p className="text-xs text-navy-500">{pharmacyAddress}</p>}
                {pharmacyPhone && <p className="text-xs text-navy-500">{pharmacyPhone}</p>}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Invoice</p>
              <p className="text-xl font-bold text-navy-900">{sale.invoice}</p>
              <p className="mt-1 text-sm text-navy-500">{formatDate(sale.date)}</p>
              <div className="mt-2 flex gap-1.5 sm:justify-end">
                <StatusBadge status={sale.status} />
                {sale.saleType === "wholesale" && <Badge tone="primary">Wholesale</Badge>}
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Bill To</p>
              <p className="mt-1.5 text-sm font-semibold text-navy-900">{sale.customer}</p>
              {customer && (
                <>
                  <p className="text-sm text-navy-500">{customer.address}</p>
                  <p className="text-sm text-navy-500">{customer.phone}</p>
                  <p className="text-sm text-navy-500">{customer.email}</p>
                </>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Payment Method</p>
              <p className="mt-1.5 text-sm font-semibold capitalize text-navy-900">{sale.payment}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-400">Cashier</p>
              <p className="mt-1.5 text-sm font-semibold text-navy-900">{sale.cashierName || "—"}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-400">Items</p>
              <p className="mt-1.5 text-sm font-semibold text-navy-900">{sale.itemCount} unit(s)</p>
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto rounded-xl border border-navy-100">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy-200 bg-navy-50/60 text-xs font-semibold uppercase tracking-wide text-navy-500">
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {sale.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-navy-800">{item.medicineName}</td>
                    <td className="px-4 py-3 text-center text-navy-600">
                      {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                      {(item.factor ?? 1) > 1 ? (
                        <span className="block text-[10px] text-navy-400">= {item.baseQuantity ?? item.quantity * (item.factor ?? 1)} base</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-navy-600">{formatRs(item.price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-navy-900">{formatRs(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-navy-500">Subtotal</dt>
                <dd className="font-medium text-navy-800">{formatRs(sale.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-navy-500">Discount</dt>
                <dd className="font-medium text-danger-600">− {formatRs(sale.discount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-navy-500">Tax</dt>
                <dd className="font-medium text-navy-800">{formatRs(sale.tax)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-navy-200 pt-2">
                <dt className="text-base font-semibold text-navy-900">Total</dt>
                <dd className="text-base font-bold text-navy-900">{formatRs(sale.total)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-navy-500">Paid ({capitalize(sale.payment)})</dt>
                <dd className="font-medium text-navy-800">{formatRs(sale.amountPaid ?? sale.total)}</dd>
              </div>
              {(sale.change ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-navy-500">Change</dt>
                  <dd className="font-medium text-navy-800">{formatRs(sale.change ?? 0)}</dd>
                </div>
              )}
              {(sale.outstanding ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-warning-700">Balance due</dt>
                  <dd className="font-semibold text-warning-700">{formatRs(sale.outstanding ?? 0)}</dd>
                </div>
              )}
            </dl>
          </div>

          <p className="border-t border-navy-100 pt-4 text-center text-xs text-navy-400">
            Thank you for choosing {pharmacyName}. This is a computer-generated invoice.
          </p>
          <p className="mt-1 text-center text-[11px] text-navy-300">Powered by MediCare</p>
        </CardBody>
      </Card>
    </div>
  );
}
