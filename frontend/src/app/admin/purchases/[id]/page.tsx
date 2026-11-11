"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, PackageCheck, Truck, Building2, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { PURCHASES, SUPPLIERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { PurchaseItem } from "@/lib/types";

interface PurchaseRow extends PurchaseItem {
  id: string;
}

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { receivePurchase } = usePharmacyData();
  const [receiving, setReceiving] = useState(false);
  const purchase = PURCHASES.find((p) => p.id === params.id);

  if (!purchase) {
    return (
      <div>
        <PageHeader
          title="Purchase order not found"
          breadcrumbs={[
            { label: "Home", href: "/admin/dashboard" },
            { label: "Purchases", href: "/admin/purchases" },
            { label: "Not found" },
          ]}
        />
        <Card>
          <EmptyState
            icon={<Truck className="h-6 w-6" />}
            title="Purchase order not found"
            description="The purchase order you are looking for does not exist."
            action={
              <Link href="/admin/purchases">
                <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Purchases</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const supplier = SUPPLIERS.find((s) => s.name === purchase.supplier);

  const rows: PurchaseRow[] = purchase.items.map((it, i) => ({ ...it, id: `${purchase.id}-${i}` }));

  const columns: Column<PurchaseRow>[] = [
    { key: "medicineName", header: "Medicine", render: (r) => <span className="font-medium text-navy-900">{r.medicineName}</span> },
    { key: "batch", header: "Batch", hideOnMobile: true, render: (r) => <span className="text-navy-600">{r.batch}</span> },
    { key: "quantity", header: "Qty", align: "center", render: (r) => <span className="text-navy-700">{r.quantity}</span> },
    { key: "purchasePrice", header: "Unit Price", align: "right", render: (r) => <span className="text-navy-600">{formatRs(r.purchasePrice)}</span> },
    { key: "lineTotal", header: "Line Total", align: "right", render: (r) => <span className="font-semibold text-navy-900">{formatRs(r.quantity * r.purchasePrice)}</span> },
    { key: "expiryDate", header: "Expiry", align: "right", hideOnMobile: true, render: (r) => <span className="text-navy-500">{formatDate(r.expiryDate)}</span> },
  ];

  const computedSubtotal = rows.reduce((s, r) => s + r.quantity * r.purchasePrice, 0);

  return (
    <div>
      <PageHeader
        title={purchase.poNumber}
        description={`${purchase.supplier} · ${purchase.itemCount} item(s)`}
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Purchases", href: "/admin/purchases" },
          { label: purchase.poNumber },
        ]}
        actions={
          <>
            <Link href="/admin/purchases">
              <Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Back</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            {purchase.status !== "received" && purchase.status !== "cancelled" && (
              <Button
                variant="success"
                loading={receiving}
                onClick={async () => {
                  setReceiving(true);
                  try {
                    await receivePurchase(purchase.id);
                    toast({ type: "success", title: "Order received", description: `${purchase.poNumber} received — stock and batches updated.` });
                  } catch (receiveError) {
                    toast({ type: "danger", title: "Unable to receive order", description: receiveError instanceof Error ? receiveError.message : "Please try again." });
                  } finally {
                    setReceiving(false);
                  }
                }}
              >
                <PackageCheck className="h-4 w-4" /> Receive Order
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: supplier + meta */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader title="Supplier" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold text-navy-900">
                <Building2 className="h-4 w-4 text-navy-400" /> {purchase.supplier}
              </div>
              {supplier && (
                <>
                  <p className="text-navy-600">{supplier.contactPerson}</p>
                  <p className="flex items-center gap-2 text-navy-500"><Phone className="h-4 w-4 text-navy-400" /> {supplier.phone}</p>
                  <p className="flex items-center gap-2 text-navy-500"><Mail className="h-4 w-4 text-navy-400" /> {supplier.email}</p>
                  <p className="flex items-center gap-2 text-navy-500"><MapPin className="h-4 w-4 text-navy-400" /> {supplier.address}</p>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Order Info" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-navy-500">Status</span>
                <StatusBadge status={purchase.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-navy-500"><Calendar className="h-4 w-4 text-navy-400" /> Order Date</span>
                <span className="font-medium text-navy-800">{formatDate(purchase.date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-navy-500"><Calendar className="h-4 w-4 text-navy-400" /> Expected</span>
                <span className="font-medium text-navy-800">{formatDate(purchase.expectedDate)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 pt-3">
                <span className="text-navy-500">Total</span>
                <span className="text-base font-bold text-navy-900">{formatRs(purchase.total)}</span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: items + totals */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Ordered Products" subtitle={`${rows.length} line item(s)`} />
            <DataTable
              columns={columns}
              rows={rows}
              empty={<EmptyState title="No items" description="This purchase order has no line items." />}
            />
            <div className="flex justify-end border-t border-navy-100 p-5">
              <dl className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-navy-500">Subtotal</dt>
                  <dd className="font-medium text-navy-800">{formatRs(computedSubtotal)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-navy-200 pt-2">
                  <dt className="text-base font-semibold text-navy-900">Order Total</dt>
                  <dd className="text-base font-bold text-navy-900">{formatRs(purchase.total)}</dd>
                </div>
              </dl>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
