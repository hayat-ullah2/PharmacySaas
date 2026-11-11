"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Plus, Phone, Mail, MapPin, Wallet, CalendarDays, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/States";
import { CUSTOMERS, SALES } from "@/lib/data";
import { formatRs, formatDate, initials } from "@/lib/utils";
import type { Sale } from "@/lib/types";

export default function ManagerCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customer = CUSTOMERS.find((c) => c.id === params.id);

  const customerSales = useMemo(() => {
    if (!customer) return [];
    return SALES.filter((s) => s.customer === customer.name);
  }, [customer]);

  if (!customer) {
    return (
      <div>
        <PageHeader
          title="Customer not found"
          breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "Customers", href: "/manager/customers" }, { label: "Not found" }]}
        />
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Customer not found"
            description="The customer you are looking for does not exist."
            action={
              <Link href="/manager/customers">
                <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Customers</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const columns: Column<Sale>[] = [
    { key: "invoice", header: "Invoice", render: (s) => <span className="font-semibold text-navy-900">{s.invoice}</span> },
    { key: "itemCount", header: "Items", align: "center", hideOnMobile: true, render: (s) => <span className="text-navy-600">{s.itemCount}</span> },
    { key: "total", header: "Total", align: "right", render: (s) => <span className="font-bold text-navy-900">{formatRs(s.total)}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "date", header: "Date", align: "right", hideOnMobile: true, render: (s) => <span className="text-navy-500">{formatDate(s.date)}</span> },
  ];

  const contact = [
    { icon: <Phone className="h-4 w-4" />, value: customer.phone },
    { icon: <Mail className="h-4 w-4" />, value: customer.email },
    { icon: <MapPin className="h-4 w-4" />, value: customer.address },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        description="Customer profile and recent activity."
        breadcrumbs={[
          { label: "Home", href: "/manager" },
          { label: "Customers", href: "/manager/customers" },
          { label: customer.name },
        ]}
        actions={
          <Link href="/manager/store">
            <Button><Plus className="h-4 w-4" /> New Sale</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <Link href="/manager/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                {initials(customer.name)}
              </span>
              <h2 className="mt-3 text-lg font-bold text-navy-900">{customer.name}</h2>
              <div className="mt-2"><StatusBadge status={customer.status} /></div>
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              {contact.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5 text-navy-600">
                  <span className="text-navy-400">{c.icon}</span>
                  <span className="min-w-0 break-words">{c.value}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* Stats + sales */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard label="Total Purchases" value={formatRs(customer.totalPurchases)} icon={<Wallet className="h-5 w-5" />} tone="success" />
            <StatCard label="Last Purchase" value={formatDate(customer.lastPurchase)} icon={<CalendarDays className="h-5 w-5" />} tone="info" />
          </div>

          <Card>
            <CardHeader title="Purchase History" subtitle={`${customerSales.length} transaction(s)`} />
            <DataTable
              columns={columns}
              rows={customerSales}
              empty={
                <EmptyState
                  icon={<Receipt className="h-6 w-6" />}
                  title="No purchases yet"
                  description="This customer has no recorded sales."
                />
              }
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
