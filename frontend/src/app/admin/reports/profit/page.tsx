"use client";

import { useMemo, useState } from "react";
import { Download, Wallet, Receipt, TrendingUp, Percent, LineChart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { CategoryBarChart } from "@/components/dashboard/Charts";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { MEDICINES, CATEGORIES, CATEGORY_SALES } from "@/lib/data";
import { formatRs, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";

const PER_PAGE = 8;

interface CategoryProfit {
  id: string;
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export default function ProfitReportPage() {
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const totals = useMemo(() => {
    const meds = category ? MEDICINES.filter((m) => m.category === category) : MEDICINES;
    const revenue = meds.reduce((s, m) => s + m.sellingPrice * m.stock, 0);
    const cost = meds.reduce((s, m) => s + m.purchasePrice * m.stock, 0);
    const profit = revenue - cost;
    const margin = revenue ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, margin };
  }, [category]);

  const rows = useMemo<CategoryProfit[]>(() => {
    return CATEGORIES.map((c) => {
      const meds = MEDICINES.filter((m) => m.category === c.name);
      const revenue = meds.reduce((s, m) => s + m.sellingPrice * m.stock, 0);
      const cost = meds.reduce((s, m) => s + m.purchasePrice * m.stock, 0);
      const profit = revenue - cost;
      const margin = revenue ? (profit / revenue) * 100 : 0;
      return { id: c.id, category: c.name, revenue, cost, profit, margin };
    })
      .filter((r) => r.revenue > 0 && (!category || r.category === category))
      .sort((a, b) => b.profit - a.profit);
  }, [category]);

  const paged = paginate(rows, page, PER_PAGE);

  const columns: Column<CategoryProfit>[] = [
    { key: "category", header: "Category", render: (r) => <span className="font-medium text-navy-900">{r.category}</span> },
    { key: "revenue", header: "Revenue", align: "right", render: (r) => <span className="text-navy-700">{formatRs(r.revenue)}</span> },
    { key: "cost", header: "Cost", align: "right", hideOnMobile: true, render: (r) => <span className="text-navy-500">{formatRs(r.cost)}</span> },
    { key: "profit", header: "Profit", align: "right", render: (r) => <span className="font-semibold text-success-600">{formatRs(r.profit)}</span> },
    {
      key: "margin",
      header: "Margin",
      align: "right",
      render: (r) => <Badge tone={r.margin >= 30 ? "success" : r.margin >= 20 ? "warning" : "danger"}>{r.margin.toFixed(1)}%</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Profit Report"
        description="Revenue against cost of goods, gross profit, and margin analytics."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Reports", href: "/admin/reports" }, { label: "Profit" }]}
        actions={
          <Button variant="outline" onClick={() => {
            const n = exportToCsv("profit-report.csv", rows, [
              { header: "Category", value: (r) => r.category },
              { header: "Revenue", value: (r) => r.revenue },
              { header: "COGS", value: (r) => r.cost },
              { header: "Profit", value: (r) => r.profit },
              { header: "Margin %", value: (r) => r.margin.toFixed(1) },
            ]);
            toast(n ? { type: "success", title: "Export ready", description: `${n} category row(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No data to export." });
          }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      {/* Filter bar */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-md">
            <Select
              label="Filter by category"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              placeholder="All Categories"
              options={CATEGORIES.map((c) => ({ value: c.name, label: c.name }))}
            />
          </div>
        </CardBody>
      </Card>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatRs(totals.revenue, { compact: true })} icon={<Wallet className="h-5 w-5" />} tone="primary" />
        <StatCard label="COGS" value={formatRs(totals.cost, { compact: true })} icon={<Receipt className="h-5 w-5" />} tone="warning" hint="Cost of goods sold" />
        <StatCard label="Gross Profit" value={formatRs(totals.profit, { compact: true })} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Margin" value={`${totals.margin.toFixed(1)}%`} icon={<Percent className="h-5 w-5" />} tone="info" hint="Gross margin" />
      </div>

      {/* Charts */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue & purchases" subtitle="Trend over time" />
          <CardBody>
            <SalesChart />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales by category" subtitle="Relative contribution" />
          <CardBody>
            <CategoryBarChart data={[...CATEGORY_SALES]} />
          </CardBody>
        </Card>
      </div>

      {/* Per-category profit table */}
      <Card className="mt-5">
        <CardHeader title="Profit by category" subtitle="Estimated revenue, cost, and margin per category" />
        <DataTable
          columns={columns}
          rows={paged}
          empty={<EmptyState icon={<LineChart className="h-6 w-6" />} title="No data" description="No category profit to display." />}
        />
        {rows.length > 0 && (
          <div className="border-t border-navy-100 px-4 py-2">
            <Pagination page={page} totalItems={rows.length} perPage={PER_PAGE} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
