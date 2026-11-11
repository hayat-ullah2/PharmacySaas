"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pill, Pencil, Trash2, ArrowLeft, Package, Tag, Factory, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { MEDICINES, BATCHES } from "@/lib/data";
import { formatRs, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Batch } from "@/lib/types";

export default function MedicineDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const medicine = MEDICINES.find((m) => m.id === params.id);

  if (!medicine) {
    return (
      <div>
        <PageHeader title="Medicine not found" breadcrumbs={[{ label: "Medicines", href: "/admin/medicines" }, { label: "Not found" }]} />
        <Card>
          <EmptyState
            icon={<Pill className="h-6 w-6" />}
            title="Medicine not found"
            description="The medicine you are looking for does not exist."
            action={<Link href="/admin/medicines"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Medicines</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  const batches = BATCHES.filter((b) => b.medicineId === medicine.id);
  const margin = medicine.sellingPrice - medicine.purchasePrice;
  const marginPct = Math.round((margin / medicine.sellingPrice) * 100);

  const batchColumns: Column<Batch>[] = [
    { key: "batchNumber", header: "Batch", render: (b) => <span className="font-medium text-navy-900">{b.batchNumber}</span> },
    { key: "purchaseDate", header: "Purchased", hideOnMobile: true, render: (b) => formatDate(b.purchaseDate) },
    { key: "expiryDate", header: "Expiry", render: (b) => formatDate(b.expiryDate) },
    { key: "remaining", header: "Remaining", align: "center", render: (b) => `${b.remaining}/${b.quantity}` },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
  ];

  const infoRows = [
    { label: "Generic Name", value: medicine.genericName },
    { label: "Category", value: medicine.category },
    { label: "Brand", value: medicine.brand },
    { label: "Manufacturer", value: medicine.manufacturer },
    { label: "Dosage Form", value: medicine.dosageForm },
    { label: "Strength", value: medicine.strength },
    { label: "Unit", value: medicine.unit },
    { label: "SKU", value: medicine.sku },
  ];

  return (
    <div>
      <PageHeader
        title={medicine.name}
        description={`${medicine.genericName} · ${medicine.strength}`}
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Medicines", href: "/admin/medicines" },
          { label: medicine.name },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => toast({ type: "info", title: "Edit medicine", description: `${medicine.name} (demo).` })}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="danger" onClick={() => toast({ type: "success", title: "Deleted", description: `${medicine.name} removed (demo).` })}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: image + quick facts */}
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100">
              <Pill className="h-20 w-20 text-primary-300" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={medicine.status} />
              {medicine.prescriptionRequired ? (
                <Badge tone="danger" dot><ShieldAlert className="h-3 w-3" /> Rx Required</Badge>
              ) : (
                <Badge tone="success" dot>OTC</Badge>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-navy-50 p-3">
                <p className="text-xs text-navy-400">Selling Price</p>
                <p className="mt-0.5 text-lg font-bold text-navy-900">{formatRs(medicine.sellingPrice)}</p>
              </div>
              <div className="rounded-xl bg-navy-50 p-3">
                <p className="text-xs text-navy-400">Purchase Price</p>
                <p className="mt-0.5 text-lg font-bold text-navy-900">{formatRs(medicine.purchasePrice)}</p>
              </div>
              <div className="rounded-xl bg-success-50 p-3">
                <p className="text-xs text-navy-400">Margin</p>
                <p className="mt-0.5 text-lg font-bold text-success-700">{formatRs(margin)} <span className="text-xs">({marginPct}%)</span></p>
              </div>
              <div className="rounded-xl bg-navy-50 p-3">
                <p className="text-xs text-navy-400">In Stock</p>
                <p className="mt-0.5 text-lg font-bold text-navy-900">{medicine.stock}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Right: details */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Product Information" />
            <CardBody>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {infoRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-navy-50 py-1.5 sm:block sm:border-0 sm:py-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{row.label}</dt>
                    <dd className="text-sm font-medium text-navy-800 sm:mt-0.5">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Description & Usage" />
            <CardBody>
              <p className="text-sm leading-relaxed text-navy-600">{medicine.description}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-lg bg-navy-50 p-3 text-sm text-navy-600">
                  <Tag className="h-4 w-4 text-navy-400" /> Reorder at {medicine.reorderLevel}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-navy-50 p-3 text-sm text-navy-600">
                  <Package className="h-4 w-4 text-navy-400" /> {medicine.unit}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-navy-50 p-3 text-sm text-navy-600">
                  <Factory className="h-4 w-4 text-navy-400" /> {medicine.manufacturer}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Available Batches" subtitle={`${batches.length} batch(es) on record`} />
            <DataTable
              columns={batchColumns}
              rows={batches}
              empty={<EmptyState title="No batches" description="No batches recorded for this medicine." />}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
