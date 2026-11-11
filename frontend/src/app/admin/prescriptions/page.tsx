"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Eye, Check, X, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { PRESCRIPTIONS } from "@/lib/data";
import { formatDate, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { usePharmacyData } from "@/lib/pharmacyData";
import { useToast } from "@/lib/toast";
import type { Prescription } from "@/lib/types";

const PER_PAGE = 8;

export default function PrescriptionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const changeStatus = async (p: Prescription, status: Prescription["status"], label: string) => {
    try {
      await saveRecord("prescriptions", { ...p, status });
      toast({ type: status === "rejected" ? "warning" : "success", title: `Prescription ${label}`, description: `${p.code} ${label}.` });
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to update prescription", description: saveError instanceof Error ? saveError.message : "Please try again." });
    }
  };

  const counts = useMemo(() => {
    const c = { all: PRESCRIPTIONS.length, pending: 0, approved: 0, dispensed: 0, rejected: 0 };
    for (const p of PRESCRIPTIONS) c[p.status]++;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return PRESCRIPTIONS.filter((p) => {
      const matchTab = tab === "all" || p.status === tab;
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.patient.toLowerCase().includes(q) ||
        p.doctor.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [search, tab]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Prescription>[] = [
    {
      key: "code",
      header: "Prescription ID",
      render: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <FileText className="h-4 w-4" />
          </span>
          <span className="font-semibold text-navy-900">{p.code}</span>
        </div>
      ),
    },
    { key: "patient", header: "Patient", render: (p) => <span className="font-medium text-navy-800">{p.patient}</span> },
    { key: "doctor", header: "Doctor", hideOnMobile: true, render: (p) => <span className="text-navy-600">{p.doctor}</span> },
    {
      key: "medicines",
      header: "Medicines",
      align: "center",
      render: (p) => <span className="text-navy-600">{p.medicines.length} items</span>,
    },
    { key: "date", header: "Date", hideOnMobile: true, render: (p) => <span className="text-navy-500">{formatDate(p.date)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <Dropdown
          align="right"
          trigger={
            <button
              className="rounded-lg px-2 py-1 text-navy-400 hover:bg-navy-100 hover:text-navy-700"
              aria-label="Actions"
              onClick={(e) => e.stopPropagation()}
            >
              •••
            </button>
          }
          items={[
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/admin/prescriptions/${p.id}`) },
            ...(p.status === "pending"
              ? [
                  { label: "Approve", icon: <Check className="h-4 w-4" />, onClick: () => changeStatus(p, "approved", "approved") },
                  { label: "", divider: true },
                  { label: "Reject", icon: <X className="h-4 w-4" />, danger: true, onClick: () => changeStatus(p, "rejected", "rejected") },
                ]
              : p.status === "approved"
                ? [{ label: "Mark Dispensed", icon: <Check className="h-4 w-4" />, onClick: () => changeStatus(p, "dispensed", "dispensed") }]
                : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        description="Review, approve, and dispense patient prescriptions."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Operations" }, { label: "Prescriptions" }]}
        actions={
          <Button variant="outline" onClick={() => {
            const n = exportToCsv("prescriptions.csv", filtered, [
              { header: "Code", value: (p) => p.code },
              { header: "Patient", value: (p) => p.patient },
              { header: "Doctor", value: (p) => p.doctor },
              { header: "Medicines", value: (p) => p.medicines.map((m) => `${m.name} x${m.qty}`).join("; ") },
              { header: "Date", value: (p) => p.date },
              { header: "Status", value: (p) => p.status },
              { header: "Notes", value: (p) => p.notes },
            ]);
            toast(n ? { type: "success", title: "Export ready", description: `${n} prescription(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No prescriptions match the current filters." });
          }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <Card>
        <div className="px-4 pt-2">
          <Tabs
            value={tab}
            onChange={(v) => { setTab(v); setPage(1); }}
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "pending", label: "Pending", count: counts.pending },
              { value: "approved", label: "Approved", count: counts.approved },
              { value: "dispensed", label: "Dispensed", count: counts.dispensed },
              { value: "rejected", label: "Rejected", count: counts.rejected },
            ]}
          />
        </div>

        <div className="p-4">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by code, patient, or doctor…"
            className="lg:max-w-sm"
          />
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          onRowClick={(p) => router.push(`/admin/prescriptions/${p.id}`)}
          empty={
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No prescriptions found"
              description="Try adjusting your search or filters."
            />
          }
        />

        {filtered.length > 0 && (
          <div className="border-t border-navy-100 px-4 py-2">
            <Pagination page={page} totalItems={filtered.length} perPage={PER_PAGE} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
