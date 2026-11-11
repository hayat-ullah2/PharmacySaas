"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Eye, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { PRESCRIPTIONS, MEDICINES } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { dispensePrescriptionToCart } from "@/lib/prescriptions";
import { formatDate, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Prescription } from "@/lib/types";

const PER_PAGE = 8;

export default function ManagerPrescriptionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const dispense = (p: Prescription) => {
    const { added, missing } = dispensePrescriptionToCart(p, [...MEDICINES], addItem);
    if (added > 0) {
      toast({ type: "success", title: "Added to cart", description: `${added} item(s) from ${p.code}${missing.length ? ` · ${missing.length} unavailable` : ""}.` });
      router.push("/manager/cart");
    } else {
      toast({ type: "warning", title: "Nothing available", description: "None of the prescribed medicines are in stock." });
    }
  };

  const counts = useMemo(() => {
    const base = { all: PRESCRIPTIONS.length, pending: 0, approved: 0, dispensed: 0, rejected: 0 };
    for (const p of PRESCRIPTIONS) base[p.status] += 1;
    return base;
  }, []);

  const filtered = useMemo(() => {
    return PRESCRIPTIONS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.patient.toLowerCase().includes(q) ||
        p.doctor.toLowerCase().includes(q);
      const matchTab = tab === "all" || p.status === tab;
      return matchSearch && matchTab;
    });
  }, [search, tab]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Prescription>[] = [
    { key: "code", header: "Code", render: (p) => <span className="font-semibold text-navy-900">{p.code}</span> },
    { key: "patient", header: "Patient", render: (p) => <span className="text-navy-700">{p.patient}</span> },
    { key: "doctor", header: "Doctor", hideOnMobile: true, render: (p) => <span className="text-navy-600">{p.doctor}</span> },
    { key: "medicines", header: "Medicines", align: "center", render: (p) => <span className="text-navy-600">{p.medicines.length}</span> },
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
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/manager/prescriptions/${p.id}`) },
            { label: "Dispense to cart", icon: <PackageCheck className="h-4 w-4" />, onClick: () => dispense(p) },
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
        breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "Selling" }, { label: "Prescriptions" }]}
      />

      <Card>
        <div className="border-b border-navy-100 px-2 pt-1">
          <Tabs
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "pending", label: "Pending", count: counts.pending },
              { value: "approved", label: "Approved", count: counts.approved },
              { value: "dispensed", label: "Dispensed", count: counts.dispensed },
              { value: "rejected", label: "Rejected", count: counts.rejected },
            ]}
            value={tab}
            onChange={(v) => { setTab(v); setPage(1); }}
            className="border-b-0"
          />
        </div>

        <div className="border-b border-navy-100 p-4">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by code, patient, or doctor…"
            className="lg:max-w-xs"
          />
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          onRowClick={(p) => router.push(`/manager/prescriptions/${p.id}`)}
          empty={
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No prescriptions found"
              description="Try adjusting your search or status filter."
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
