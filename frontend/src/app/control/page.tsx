"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Plus,
  Building2,
  LogOut,
  Copy,
  Check,
  Ban,
  RotateCcw,
  KeyRound,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { getSupabaseClient, getAccessToken } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { EmptyState } from "@/components/ui/States";
import { PharmacyEditModal } from "@/components/control/PharmacyEditModal";
import { PharmacyDeleteModal } from "@/components/control/PharmacyDeleteModal";
import { formatDate, formatRs } from "@/lib/utils";

interface PharmacyRow {
  id: string;
  name: string;
  status: "active" | "suspended";
  logo_url: string;
  created_at: string;
  owner_id: string;
  subscription_price: number;
  subscription_start: string | null;
  subscription_expiry: string | null;
  ownerEmail?: string;
  ownerName?: string;
}

interface NewCredentials {
  email: string;
  password: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isExpired(p: PharmacyRow): boolean {
  return !!p.subscription_expiry && p.subscription_expiry < todayIso();
}

export default function ControlDashboard() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pharmacies, setPharmacies] = useState<PharmacyRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [subscriptionStart, setSubscriptionStart] = useState("");
  const [subscriptionExpiry, setSubscriptionExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<NewCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PharmacyRow | null>(null);
  const [deleting, setDeleting] = useState<PharmacyRow | null>(null);

  // Gate: super admin only.
  useEffect(() => {
    if (ready && user?.role !== "super_admin") router.replace("/login");
  }, [ready, user, router]);

  const loadPharmacies = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const [{ data: rows, error: rowsError }, { data: owners }] = await Promise.all([
        supabase.from("pharmacies").select("id, name, status, logo_url, created_at, owner_id, subscription_price, subscription_start, subscription_expiry").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, name, email, pharmacy_id, role").eq("role", "admin"),
      ]);
      if (rowsError) throw rowsError;
      const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));
      setPharmacies(
        (rows ?? []).map((r) => {
          const owner = ownerById.get(r.owner_id);
          return { ...r, ownerEmail: owner?.email, ownerName: owner?.name } as PharmacyRow;
        }),
      );
    } catch (loadError) {
      toast({ type: "danger", title: "Unable to load pharmacies", description: loadError instanceof Error ? loadError.message : "Please try again." });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    // Fetch-on-mount: setState happens only after the async load resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && user?.role === "super_admin") void loadPharmacies();
  }, [ready, user, loadPharmacies]);

  const resetForm = () => {
    setPharmacyName("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPassword("");
    setLogoUrl("");
    setSubscriptionPrice("");
    setSubscriptionStart("");
    setSubscriptionExpiry("");
  };

  // Opens the register modal with sensible subscription defaults (starts today,
  // 30-day term). Computing dates in the click handler keeps render pure.
  const openAddModal = () => {
    resetForm();
    setSubscriptionStart(todayIso());
    setSubscriptionExpiry(addDaysIso(30));
    setAddOpen(true);
  };

  const registerPharmacy = async () => {
    if (subscriptionExpiry && subscriptionStart && subscriptionExpiry < subscriptionStart) {
      toast({ type: "warning", title: "Check the dates", description: "Expiry date must be on or after the start date." });
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();

      const res = await fetch("/api/control/register-pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pharmacyName, ownerName, ownerEmail, logoUrl, password: ownerPassword, subscriptionPrice, subscriptionStart, subscriptionExpiry }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not register the pharmacy.");

      setAddOpen(false);
      resetForm();
      setCredentials({ email: payload.email, password: payload.password });
      if (payload.warning) toast({ type: "warning", title: "Pharmacy created with a warning", description: payload.warning });
      await loadPharmacies();
    } catch (registerError) {
      toast({ type: "danger", title: "Unable to register pharmacy", description: registerError instanceof Error ? registerError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (row: PharmacyRow, status: "active" | "suspended") => {
    setBusyId(row.id);
    try {
      const { error } = await getSupabaseClient().from("pharmacies").update({ status }).eq("id", row.id);
      if (error) throw error;
      toast({ type: "success", title: status === "suspended" ? "Pharmacy suspended" : "Pharmacy reactivated", description: row.name });
      await loadPharmacies();
    } catch (statusError) {
      toast({ type: "danger", title: "Unable to update status", description: statusError instanceof Error ? statusError.message : "Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const resetOwnerPassword = async (row: PharmacyRow) => {
    setBusyId(row.id);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/control/reset-owner-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pharmacyId: row.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not reset the password.");
      setCredentials({ email: payload.email, password: payload.password });
    } catch (resetError) {
      toast({ type: "danger", title: "Unable to reset password", description: resetError instanceof Error ? resetError.message : "Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ type: "warning", title: "Copy failed", description: "Select and copy the credentials manually." });
    }
  };

  if (!ready || user?.role !== "super_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900 text-navy-300">
        <ShieldCheck className="h-6 w-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="font-bold">MediCare Control</p>
              <p className="text-xs text-navy-400">Super Admin · {user.email}</p>
            </div>
          </div>
          <button
            onClick={async () => { await logout(); router.replace("/login"); }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-navy-200 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Pharmacies</h1>
            <p className="text-sm text-navy-400">Register and manage every pharmacy tenant.</p>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4" /> Register Pharmacy
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={pharmacies.length} />
          <Stat label="Active" value={pharmacies.filter((p) => p.status === "active" && !isExpired(p)).length} />
          <Stat label="Suspended" value={pharmacies.filter((p) => p.status === "suspended").length} />
          <Stat label="Expired" value={pharmacies.filter((p) => p.status === "active" && isExpired(p)).length} />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-navy-800">
          {loadingList ? (
            <div className="p-10 text-center text-sm text-navy-400">Loading pharmacies…</div>
          ) : pharmacies.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title="No pharmacies yet"
                description="Register your first pharmacy to create its owner account."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-navy-400">
                    <th className="px-4 py-3 font-medium">Pharmacy</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Subscription</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pharmacies.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                            {p.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.logo_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="h-4 w-4 text-navy-400" />
                            )}
                          </span>
                          <Link href={`/control/${p.id}`} className="font-medium text-white hover:text-primary-300 hover:underline">
                            {p.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-navy-300">{p.ownerEmail ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium text-white">{formatRs(p.subscription_price)}</span>
                          <span className={isExpired(p) ? "text-xs text-danger-400" : "text-xs text-navy-400"}>
                            {p.subscription_expiry
                              ? `${isExpired(p) ? "Expired" : "Expires"} ${formatDate(p.subscription_expiry)}`
                              : "No expiry"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.status === "suspended" ? (
                          <Badge tone="danger">suspended</Badge>
                        ) : isExpired(p) ? (
                          <Badge tone="warning">expired</Badge>
                        ) : (
                          <Badge tone="success">active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy-400">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditing(p)} title="Edit pharmacy & subscription">
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" loading={busyId === p.id} onClick={() => resetOwnerPassword(p)} title="Reset the owner's password">
                            <KeyRound className="h-4 w-4" /> Password
                          </Button>
                          {p.status === "active" ? (
                            <Button variant="outline" size="sm" loading={busyId === p.id} onClick={() => setStatus(p, "suspended")}>
                              <Ban className="h-4 w-4" /> Suspend
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" loading={busyId === p.id} onClick={() => setStatus(p, "active")}>
                              <RotateCcw className="h-4 w-4" /> Reactivate
                            </Button>
                          )}
                          <Button variant="danger" size="sm" onClick={() => setDeleting(p)} title="Delete pharmacy permanently">
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Register pharmacy modal */}
      <Modal
        open={addOpen}
        onClose={() => { if (!saving) { setAddOpen(false); resetForm(); } }}
        title="Register Pharmacy"
        description="Creates the pharmacy and its owner account."
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }} disabled={saving}>Cancel</Button>
            <Button
              onClick={registerPharmacy}
              loading={saving}
              disabled={pharmacyName.trim().length < 2 || ownerName.trim().length < 2 || !ownerEmail.trim()}
            >
              Create Pharmacy
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ImageUpload value={logoUrl} onChange={setLogoUrl} folder="pharmacy-logos" label="Pharmacy logo" />
          <Input label="Pharmacy name" placeholder="e.g. City Care Pharmacy" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} />
          <Input label="Owner full name" placeholder="Owner's name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="off" />
          <Input label="Owner email" type="email" placeholder="owner@pharmacy.com" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} autoComplete="off" />
          <Input
            label="Owner password (optional)"
            type="text"
            placeholder="Leave blank to auto-generate"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            autoComplete="off"
            hint="If set, you choose the owner's password. Otherwise a strong one is generated and shown once."
          />

          <div className="border-t border-navy-100 pt-4">
            <p className="mb-3 text-sm font-semibold text-navy-800">Subscription</p>
            <div className="space-y-4">
              <Input
                label="Price (Rs)"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={subscriptionPrice}
                onChange={(e) => setSubscriptionPrice(e.target.value)}
                hint="Set a custom amount for this pharmacy. Leave 0 for a free account."
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start date" type="date" value={subscriptionStart} onChange={(e) => setSubscriptionStart(e.target.value)} />
                <Input
                  label="Expiry date"
                  type="date"
                  value={subscriptionExpiry}
                  onChange={(e) => setSubscriptionExpiry(e.target.value)}
                  hint="Leave blank for no expiry. On expiry, the pharmacy is cut off automatically."
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Generated credentials modal */}
      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="Owner credentials"
        description="Share these with the owner now — the password is shown only once."
        footer={<Button onClick={() => setCredentials(null)}>Done</Button>}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-warning-50 p-3 text-sm text-warning-800">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
            This password can’t be retrieved later. Copy it before closing.
          </div>
          <div className="rounded-lg border border-navy-200 bg-navy-50 p-3 font-mono text-sm text-navy-800">
            <div><span className="text-navy-400">Email:</span> {credentials?.email}</div>
            <div><span className="text-navy-400">Password:</span> {credentials?.password}</div>
          </div>
          <Button variant="outline" className="w-full" onClick={copyCredentials}>
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy credentials</>}
          </Button>
        </div>
      </Modal>

      {editing && (
        <PharmacyEditModal
          pharmacy={editing}
          onClose={() => setEditing(null)}
          onSaved={loadPharmacies}
        />
      )}

      {deleting && (
        <PharmacyDeleteModal
          pharmacy={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={loadPharmacies}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-800 p-4">
      <p className="text-xs uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
