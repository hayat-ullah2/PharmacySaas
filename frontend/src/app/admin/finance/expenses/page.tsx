"use client";

import { useMemo, useState } from "react";
import { Plus, Receipt, TrendingDown, Hash, Sigma } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendBarChart } from "@/components/dashboard/Charts";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { EXPENSES } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { formatRs, formatDate, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Expense } from "@/lib/types";

const PER_PAGE = 8;

const EXPENSE_CATEGORIES = Array.from(new Set(EXPENSES.map((e) => e.category)));

export default function ExpensesPage() {
  const { toast } = useToast();
  const { saveRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "Rent", amount: "", description: "", method: "cash" });

  const resetPage = () => setPage(1);

  const stats = useMemo(() => {
    const total = EXPENSES.reduce((s, e) => s + e.amount, 0);
    const count = EXPENSES.length;
    return { total, count, avg: count ? Math.round(total / count) : 0 };
  }, []);

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of EXPENSES) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const filtered = useMemo(() => {
    return EXPENSES.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      const matchCat = !category || e.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<Expense>[] = [
    { key: "category", header: "Category", render: (e) => <Badge tone="navy">{e.category}</Badge> },
    { key: "description", header: "Description", render: (e) => <span className="text-navy-700">{e.description}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (e) => <span className="font-semibold text-navy-900">{formatRs(e.amount)}</span>,
    },
    {
      key: "date",
      header: "Date",
      align: "right",
      hideOnMobile: true,
      render: (e) => <span className="text-navy-500">{formatDate(e.date)}</span>,
    },
    {
      key: "method",
      header: "Method",
      hideOnMobile: true,
      render: (e) => <span className="capitalize text-navy-600">{e.method}</span>,
    },
  ];

  const submit = async () => {
    const amount = Number(form.amount);
    if (!form.description.trim()) {
      toast({ type: "warning", title: "Description required", description: "Describe what this expense was for." });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ type: "warning", title: "Invalid amount", description: "Enter an amount greater than zero." });
      return;
    }
    setSaving(true);
    try {
      await saveRecord("expenses", {
        id: crypto.randomUUID(),
        category: form.category,
        description: form.description.trim(),
        amount,
        date: new Date().toISOString().slice(0, 10),
        method: form.method as Expense["method"],
      });
      toast({ type: "success", title: "Expense added", description: `${form.category} expense of ${formatRs(amount)} recorded.` });
      setAddOpen(false);
      setForm({ category: "Rent", amount: "", description: "", method: "cash" });
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save expense", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Record operating costs and monitor where your money is going."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Finance" }, { label: "Expenses" }]}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Expenses" value={formatRs(stats.total)} icon={<TrendingDown className="h-5 w-5" />} tone="danger" hint={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
        <StatCard label="Entries" value={String(stats.count)} icon={<Hash className="h-5 w-5" />} tone="info" hint="Recorded this month" />
        <StatCard label="Average Expense" value={formatRs(stats.avg)} icon={<Sigma className="h-5 w-5" />} tone="navy" hint="Per entry" />
      </div>

      <Card className="mt-5">
        <CardHeader title="Spending by category" subtitle="Distribution of expenses this month" />
        <CardBody>
          <TrendBarChart data={breakdown} color="#ef4444" />
        </CardBody>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="Search by description or category…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="lg:ml-auto lg:w-56">
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); resetPage(); }}
              placeholder="All Categories"
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No expenses found"
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

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add expense"
        description="Record a new operating expense."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!form.description.trim() || !form.amount}>Save Expense</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Method"
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "bank", label: "Bank" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <Input
            label="Amount (Rs)"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={3}
            placeholder="What was this expense for?"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
