"use client";

import { useMemo, useState } from "react";
import { Shield, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox } from "@/components/ui/Toggle";
import { USERS } from "@/lib/data";
import type { Role } from "@/lib/types";

type ActionKey = "view" | "create" | "edit" | "delete";
type Actions = Record<ActionKey, boolean>;
type Matrix = Record<string, Actions>;

// The system only has two roles: the pharmacy Owner (admin) and the Manager (POS).
const ROLES: { key: Role; name: string; description: string }[] = [
  { key: "admin", name: "Admin (Owner)", description: "Full system access and configuration control." },
  { key: "manager", name: "Manager (POS)", description: "Point-of-sale only: sales, returns, prescriptions, and billing customers." },
];

const MODULES = [
  { key: "medicines", label: "Medicines" },
  { key: "inventory", label: "Inventory" },
  { key: "sales", label: "Sales" },
  { key: "purchases", label: "Purchases" },
  { key: "customers", label: "Customers" },
  { key: "prescriptions", label: "Prescriptions" },
  { key: "users", label: "Users" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
];

const ACTIONS: ActionKey[] = ["view", "create", "edit", "delete"];

const all = (view = true, create = true, edit = true, del = true): Actions => ({ view, create, edit, delete: del });

/** What each role can actually do (reference; real access is enforced by RLS). */
function defaults(role: Role): Matrix {
  const viewOnly = all(true, false, false, false);
  const none = all(false, false, false, false);
  if (role === "admin") {
    return Object.fromEntries(MODULES.map((m) => [m.key, all()])) as Matrix;
  }
  // Manager = POS only: browse products, ring up sales, add billing customers,
  // and dispense approved prescriptions. No inventory/purchasing/admin modules.
  return {
    medicines: viewOnly,
    inventory: none,
    sales: all(true, true, false, false),
    purchases: none,
    customers: all(true, true, false, false),
    prescriptions: all(true, true, false, false),
    users: none,
    reports: none,
    settings: none,
  };
}

export default function RolesPage() {
  const [role, setRole] = useState<Role>("admin");

  const [perms, setPerms] = useState<Record<string, Matrix>>(() =>
    Object.fromEntries(ROLES.map((r) => [r.key, defaults(r.key)])),
  );

  const userCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of USERS) counts[u.role] = (counts[u.role] ?? 0) + 1;
    return counts;
  }, []);

  const activeMatrix = perms[role];

  const setCell = (moduleKey: string, action: ActionKey, value: boolean) => {
    setPerms((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleKey]: { ...prev[role][moduleKey], [action]: value },
      },
    }));
  };

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Reference for what each role can do. Access is enforced by the system (row-level security), independent of this screen."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Administration" }, { label: "Roles" }]}
      />

      {/* Role cards */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        {ROLES.map((r) => {
          const active = r.key === role;
          return (
            <button key={r.key} onClick={() => setRole(r.key)} className="text-left">
              <Card className={active ? "ring-2 ring-primary-500" : "transition hover:border-navy-300"}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-600"}`}>
                      <Shield className="h-5 w-5" />
                    </span>
                    <Badge tone="navy">
                      <Users className="h-3 w-3" /> {userCounts[r.key] ?? 0}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-navy-900">{r.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-navy-500">{r.description}</p>
                </CardBody>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Permission matrix */}
      <Card>
        <div className="border-b border-navy-100 px-4 pt-2">
          <Tabs
            value={role}
            onChange={(v) => setRole(v as Role)}
            items={ROLES.map((r) => ({ value: r.key, label: r.name }))}
          />
        </div>

        <div className="flex items-center gap-2 px-5 py-4">
          <ShieldCheck className="h-4 w-4 text-primary-600" />
          <p className="text-sm text-navy-600">
            Default access for <span className="font-semibold text-navy-900">{ROLES.find((r) => r.key === role)?.name}</span>
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-navy-200 bg-navy-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-navy-500">Module</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-navy-500">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {MODULES.map((m) => (
                <tr key={m.key} className="hover:bg-navy-50/40">
                  <td className="px-5 py-3 font-medium text-navy-800">{m.label}</td>
                  {ACTIONS.map((a) => (
                    <td key={a} className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={activeMatrix[m.key][a]}
                          onChange={(v) => setCell(m.key, a, v)}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </Card>
    </div>
  );
}
