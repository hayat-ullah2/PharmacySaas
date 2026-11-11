"use client";

import { useMemo, useState } from "react";
import { ScrollText, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { AUDIT_LOGS, USERS } from "@/lib/data";
import { initials, paginate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";
import { useToast } from "@/lib/toast";
import type { AuditLog } from "@/lib/types";

const PER_PAGE = 6;

const actionTone: Record<string, BadgeTone> = {
  Created: "success",
  Updated: "info",
  Adjusted: "warning",
  Approved: "primary",
  Deleted: "danger",
  Transferred: "info",
  Login: "navy",
};

const userColor = (name: string) => USERS.find((u) => u.name === name)?.avatarColor ?? "#64748b";

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);

  const actionOptions = useMemo(
    () => Array.from(new Set(AUDIT_LOGS.map((l) => l.action))).map((a) => ({ value: a, label: a })),
    [],
  );
  const entityOptions = useMemo(
    () => Array.from(new Set(AUDIT_LOGS.map((l) => l.entity))).map((e) => ({ value: e, label: e })),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return AUDIT_LOGS.filter((l) => {
      const matchSearch = !q || l.user.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q);
      const matchAction = !action || l.action === action;
      const matchEntity = !entity || l.entity === entity;
      return matchSearch && matchAction && matchEntity;
    });
  }, [search, action, entity]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<AuditLog>[] = [
    {
      key: "user",
      header: "User",
      render: (l) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: userColor(l.user) }}
          >
            {initials(l.user)}
          </span>
          <span className="font-medium text-navy-900">{l.user}</span>
        </div>
      ),
    },
    { key: "action", header: "Action", render: (l) => <Badge tone={actionTone[l.action] ?? "navy"}>{l.action}</Badge> },
    { key: "entity", header: "Entity", hideOnMobile: true, render: (l) => <span className="text-navy-600">{l.entity}</span> },
    { key: "detail", header: "Detail", render: (l) => <span className="text-navy-600">{l.detail}</span> },
    { key: "timestamp", header: "Timestamp", hideOnMobile: true, render: (l) => <span className="text-navy-500">{l.timestamp}</span> },
    {
      key: "ip",
      header: "IP",
      align: "right",
      hideOnMobile: true,
      render: (l) => <span className="font-mono text-xs text-navy-500">{l.ip}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track every action taken across the system."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Administration" }, { label: "Audit Logs" }]}
        actions={
          <Button variant="outline" onClick={() => {
            const n = exportToCsv("audit-logs.csv", filtered, [
              { header: "Timestamp", value: (l) => l.timestamp },
              { header: "User", value: (l) => l.user },
              { header: "Action", value: (l) => l.action },
              { header: "Entity", value: (l) => l.entity },
              { header: "Detail", value: (l) => l.detail },
              { header: "IP", value: (l) => l.ip },
            ]);
            toast(n ? { type: "success", title: "Export ready", description: `${n} log(s) downloaded as CSV.` } : { type: "info", title: "Nothing to export", description: "No logs match the current filters." });
          }}>
            <Download className="h-4 w-4" /> Export Logs
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by user or detail…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
            <Select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              placeholder="All Actions"
              options={actionOptions}
            />
            <Select
              value={entity}
              onChange={(e) => { setEntity(e.target.value); setPage(1); }}
              placeholder="All Entities"
              options={entityOptions}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<ScrollText className="h-6 w-6" />}
              title="No audit logs found"
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
