"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowLeft, Check, X, PackageCheck, Printer, User, Stethoscope, CalendarDays, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { PRESCRIPTIONS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { PrescriptionStatus } from "@/lib/types";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();
  const [busy, setBusy] = useState(false);
  const prescription = PRESCRIPTIONS.find((p) => p.id === params.id);

  if (!prescription) {
    return (
      <div>
        <PageHeader
          title="Prescription not found"
          breadcrumbs={[
            { label: "Home", href: "/admin/dashboard" },
            { label: "Prescriptions", href: "/admin/prescriptions" },
            { label: "Not found" },
          ]}
        />
        <Card>
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Prescription not found"
            description="The prescription you are looking for does not exist."
            action={
              <Link href="/admin/prescriptions">
                <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Prescriptions</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const changeStatus = async (status: PrescriptionStatus, label: string) => {
    setBusy(true);
    try {
      await saveRecord("prescriptions", { ...prescription, status });
      toast({ type: status === "rejected" ? "warning" : "success", title: `Prescription ${label}`, description: `${prescription.code} ${label}.` });
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to update prescription", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const actions = (
    <>
      {prescription.status === "pending" && (
        <>
          <Button variant="success" loading={busy} onClick={() => changeStatus("approved", "approved")}>
            <Check className="h-4 w-4" /> Approve
          </Button>
          <Button variant="danger" loading={busy} onClick={() => changeStatus("rejected", "rejected")}>
            <X className="h-4 w-4" /> Reject
          </Button>
        </>
      )}
      {prescription.status === "approved" && (
        <Button variant="success" loading={busy} onClick={() => changeStatus("dispensed", "dispensed")}>
          <PackageCheck className="h-4 w-4" /> Mark as Dispensed
        </Button>
      )}
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title={prescription.code}
        description={`Prescription for ${prescription.patient}`}
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Prescriptions", href: "/admin/prescriptions" },
          { label: prescription.code },
        ]}
        actions={actions}
      />

      <div className="mb-4">
        <Link href="/admin/prescriptions" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 transition hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Back to Prescriptions
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden">
          {/* Rx sheet header */}
          <div className="flex items-start justify-between gap-4 border-b-2 border-primary-100 bg-gradient-to-br from-primary-50 to-white px-6 py-5">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-600 font-serif text-3xl font-bold text-white shadow-sm">
                ℞
              </span>
              <div>
                <p className="text-lg font-bold text-navy-900">MediCare Pharmacy</p>
                <p className="text-sm text-navy-500">Shahrah-e-Faisal, Karachi · +92 21 111 000 111</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary-700">
                  <Stethoscope className="h-4 w-4" /> {prescription.doctor}
                </p>
              </div>
            </div>
            <StatusBadge status={prescription.status} />
          </div>

          <CardBody className="space-y-6">
            {/* Patient + date block */}
            <div className="grid gap-4 rounded-xl bg-navy-50 p-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-navy-400">
                  <User className="h-3.5 w-3.5" /> Patient
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-900">{prescription.patient}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-navy-400">
                  <FileText className="h-3.5 w-3.5" /> Prescription ID
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-900">{prescription.code}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-navy-400">
                  <CalendarDays className="h-3.5 w-3.5" /> Date Issued
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-900">{formatDate(prescription.date)}</p>
              </div>
            </div>

            {/* Medicines */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="font-serif text-2xl font-bold text-primary-600">℞</span>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-500">Prescribed Medicines</h3>
              </div>
              <div className="overflow-hidden rounded-xl border border-navy-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-200 bg-navy-50/60 text-left text-xs font-semibold uppercase tracking-wide text-navy-500">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Medicine</th>
                      <th className="px-4 py-2.5">Dosage / Instructions</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {prescription.medicines.map((m, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-navy-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-medium text-navy-900">
                            <Pill className="h-4 w-4 text-primary-500" /> {m.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-navy-600">{m.dosage}</td>
                        <td className="px-4 py-3 text-right font-semibold text-navy-900">{m.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-dashed border-navy-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Doctor&apos;s Notes</p>
              <p className="mt-1.5 text-sm italic leading-relaxed text-navy-700">{prescription.notes}</p>
            </div>

            {/* Signature line */}
            <div className="flex items-end justify-between pt-4">
              <p className="text-xs text-navy-400">This is a computer-generated prescription record.</p>
              <div className="text-center">
                <div className="mb-1 w-44 border-b border-navy-300" />
                <p className="text-xs font-medium text-navy-600">{prescription.doctor}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
