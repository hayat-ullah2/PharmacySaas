"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Receipt, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { SALES, CUSTOMERS } from "@/lib/data";
import { formatRs, formatDate } from "@/lib/utils";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
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
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
                <Pill className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-bold text-navy-900">MediCare Pharmacy</p>
                <p className="text-xs text-navy-500">Shahrah-e-Faisal, Karachi, Pakistan</p>
                <p className="text-xs text-navy-500">+92 21 111 000 111 · billing@medicare.pk</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Invoice</p>
              <p className="text-xl font-bold text-navy-900">{sale.invoice}</p>
              <p className="mt-1 text-sm text-navy-500">{formatDate(sale.date)}</p>
              <div className="mt-2 flex sm:justify-end">
                <StatusBadge status={sale.status} />
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
                    <td className="px-4 py-3 text-center text-navy-600">{item.quantity}</td>
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
            </dl>
          </div>

          <p className="border-t border-navy-100 pt-4 text-center text-xs text-navy-400">
            Thank you for choosing MediCare Pharmacy. This is a computer-generated invoice.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
