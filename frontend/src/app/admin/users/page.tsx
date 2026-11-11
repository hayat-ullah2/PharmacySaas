"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchBar } from "@/components/tables/SearchBar";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { USERS } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { usePharmacyData } from "@/lib/pharmacyData";
import { getAccessToken } from "@/lib/supabase";
import { initials, paginate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { User } from "@/lib/types";

async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const PER_PAGE = 8;

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function UsersPage() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const router = useRouter();
  const { reload } = usePharmacyData();

  const handleSessionExpired = useCallback(async () => {
    toast({ type: "warning", title: "Session expired", description: "Please sign in again to continue." });
    try { await logout(); } catch { /* ignore */ }
    router.replace("/login");
  }, [toast, logout, router]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const closeAdd = () => {
    setAddOpen(false);
    setName("");
    setEmail("");
    setPassword("");
    setFormError("");
  };

  const createManager = async () => {
    setSaving(true);
    setFormError("");
    try {
      let headers: Record<string, string>;
      try {
        headers = await authHeader();
      } catch {
        await handleSessionExpired();
        return;
      }
      const res = await fetch("/api/admin/create-manager", {
        method: "POST",
        headers,
        body: JSON.stringify({ name, email, password }),
      });
      if (res.status === 401) {
        await handleSessionExpired();
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Unable to add this manager.");
      toast({ type: "success", title: "Manager created", description: `${email} can now sign in to the POS.` });
      closeAdd();
      await reload();
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "Unable to add this manager.");
    } finally {
      setSaving(false);
    }
  };

  const deleteManager = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      let headers: Record<string, string>;
      try {
        headers = await authHeader();
      } catch {
        await handleSessionExpired();
        return;
      }
      const res = await fetch("/api/admin/delete-manager", {
        method: "POST",
        headers,
        body: JSON.stringify({ managerId: deleteTarget.id }),
      });
      if (res.status === 401) {
        await handleSessionExpired();
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Unable to remove this manager.");
      toast({ type: "success", title: "Manager removed", description: `${deleteTarget.name}'s account was deleted.` });
      setDeleteTarget(null);
      await reload();
    } catch (deleteError) {
      toast({ type: "danger", title: "Unable to remove manager", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return USERS.filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = !role || u.role === role;
      const matchStatus = !status || u.status === status;
      return matchSearch && matchRole && matchStatus;
    });
  }, [search, role, status]);

  const paged = paginate(filtered, page, PER_PAGE);

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      render: (u) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: u.avatarColor }}
          >
            {initials(u.name)}
          </span>
          <span className="font-medium text-navy-900">{u.name}</span>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (u) => <span className="text-navy-600">{u.email}</span> },
    { key: "role", header: "Role", render: (u) => <Badge tone="primary">{cap(u.role)}</Badge> },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    { key: "lastLogin", header: "Last Login", hideOnMobile: true, render: (u) => <span className="text-navy-500">{u.lastLogin}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
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
            ...(u.role === "manager"
              ? [{
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  danger: true,
                  onClick: () => setDeleteTarget(u),
                }]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Add managers and manage their pharmacy access."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Administration" }, { label: "Users" }]}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-navy-100 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by name or email…"
            className="lg:max-w-xs lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
            <Select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              placeholder="All Roles"
              options={ROLE_OPTIONS}
            />
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              placeholder="All Status"
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          empty={
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title="No users found"
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
        onClose={() => { if (!saving) closeAdd(); }}
        title="Add Manager"
        description="Create a manager login for this pharmacy's POS."
        footer={
          <>
            <Button variant="outline" onClick={closeAdd} disabled={saving}>Cancel</Button>
            <Button
              loading={saving}
              disabled={name.trim().length < 2 || !email.trim() || password.length < 6}
              onClick={createManager}
            >
              Create Manager
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Manager full name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ahmed Khan" autoComplete="off" />
          <Input label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="manager@example.com" autoComplete="off" />
          <Input
            label="Password"
            type="text"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            autoComplete="off"
            hint="Share this with the manager — they use it to sign in to the POS."
          />
          {formError && <p role="alert" className="text-sm text-danger-700">{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Delete manager"
        description={`Remove ${deleteTarget?.name}? Their login will stop working immediately. This can't be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={deleteManager}>Delete</Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <Trash2 className="h-5 w-5 shrink-0" />
          The manager account and its access to this pharmacy will be permanently deleted.
        </div>
      </Modal>
    </div>
  );
}
