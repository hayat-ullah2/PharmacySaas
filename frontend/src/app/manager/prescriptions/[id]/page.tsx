"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ShoppingCart, Printer, Pill, User, Stethoscope, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { PRESCRIPTIONS, MEDICINES } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { dispensePrescriptionToCart } from "@/lib/prescriptions";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast";

export default function ManagerPrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { addItem } = useCart();
  const rx = PRESCRIPTIONS.find((p) => p.id === params.id);

  if (!rx) {
    return (
      <div>
        <PageHeader
          title="Prescription not found"
          breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "Prescriptions", href: "/manager/prescriptions" }, { label: "Not found" }]}
        />
        <Card>
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Prescription not found"
            description="The prescription you are looking for does not exist."
            action={
              <Link href="/manager/prescriptions">
                <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Prescriptions</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const meta = [
    { icon: <User className="h-4 w-4" />, label: "Patient", value: rx.patient },
    { icon: <Stethoscope className="h-4 w-4" />, label: "Prescribing Doctor", value: rx.doctor },
    { icon: <CalendarDays className="h-4 w-4" />, label: "Date Issued", value: formatDate(rx.date) },
  ];

  return (
    <div>
      <PageHeader
        title={rx.code}
        description={`Prescription for ${rx.patient}`}
        breadcrumbs={[
          { label: "Home", href: "/manager" },
          { label: "Prescriptions", href: "/manager/prescriptions" },
          { label: rx.code },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              onClick={() => {
                const { added, missing } = dispensePrescriptionToCart(rx, [...MEDICINES], addItem);
                if (added > 0) {
                  toast({ type: "success", title: "Added to cart", description: `${added} item(s) added${missing.length ? ` · ${missing.length} unavailable` : ""}.` });
                  router.push("/manager/cart");
                } else {
                  toast({ type: "warning", title: "Nothing available", description: "None of the prescribed medicines are in stock." });
                }
              }}
            >
              <ShoppingCart className="h-4 w-4" /> Dispense to Cart
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Link href="/manager/prescriptions" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Back to Prescriptions
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <Card>
          <CardBody className="sm:p-8">
            {/* Rx header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-navy-100 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-3xl font-bold text-primary-600">
                  ℞
                </span>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">{rx.code}</h2>
                  <p className="text-sm text-navy-400">MediCare Pharmacy · Prescription</p>
                </div>
              </div>
              <StatusBadge status={rx.status} />
            </div>

            {/* Meta grid */}
            <div className="grid gap-4 py-5 sm:grid-cols-3">
              {meta.map((m) => (
                <div key={m.label} className="rounded-xl bg-navy-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-navy-400">
                    {m.icon} {m.label}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-navy-800">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Medicines */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-navy-800">Prescribed Medicines</h3>
              <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100">
                {rx.medicines.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="flex items-center gap-3 p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <Pill className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy-900">{m.name}</p>
                      <p className="text-xs text-navy-400">{m.dosage}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-navy-50 px-2.5 py-1 text-sm font-semibold text-navy-700">
                      Qty {m.qty}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notes */}
            {rx.notes && (
              <div className="mt-5 rounded-xl bg-info-50 p-4 text-sm text-info-700">
                <p className="font-semibold">Doctor&apos;s Notes</p>
                <p className="mt-1 text-info-600">{rx.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
