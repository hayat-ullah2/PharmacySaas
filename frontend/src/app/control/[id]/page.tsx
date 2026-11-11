"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Building2,
  Ban,
  RotateCcw,
  KeyRound,
  Pencil,
  Trash2,
  Copy,
  Check,
  Users,
  Wallet,
  CalendarClock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { getSupabaseClient, getAccessToken } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { PharmacyEditModal } from "@/components/control/PharmacyEditModal";
import { PharmacyDeleteModal } from "@/components/control/PharmacyDeleteModal";
import { formatDate, formatRs } from "@/lib/utils";

interface PharmacyDetail {
  id: string;
  name: string;
  status: "active" | "suspended";
  logo_url: string;
  created_at: string;
  owner_id: string;
  subscription_price: number;
  subscription_start: string | null;
  subscription_expiry: string | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login: string | null;
  created_at: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PharmacyDetailPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();

  const [pharmacy, setPharmacy] = useState<PharmacyDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Gate: super admin only.
  useEffect(() => {
    if (ready && user?.role !== "super_admin") router.replace("/login");
  }, [ready, user, router]);

  const load = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const [{ data: ph, error: phError }, { data: team }] = await Promise.all([
        supabase
          .from("pharmacies")
          .select("id, name, status, logo_url, created_at, owner_id, subscription_price, subscription_start, subscription_expiry")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, name, email, role, status, last_login, created_at")
          .eq("pharmacy_id", id)
          .order("role", { ascending: true }),
      ]);
      if (phError) throw phError;
      if (!ph) {
        setNotFound(true);
        return;
      }
      setPharmacy(ph as PharmacyDetail);
      setMembers((team ?? []) as Member[]);
    } catch (loadError) {
      toast({ type: "danger", title: "Unable to load pharmacy", description: loadError instanceof Error ? loadError.message : "Please try again." });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    // Fetch-on-mount: setState happens only after the async load resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && user?.role === "super_admin") void load();
  }, [ready, user, load]);

  const setStatus = async (status: "active" | "suspended") => {
    if (!pharmacy) return;
    setBusy(true);
    try {
      const { error } = await getSupabaseClient().from("pharmacies").update({ status }).eq("id", pharmacy.id);
      if (error) throw error;
      toast({ type: "success", title: status === "suspended" ? "Pharmacy suspended" : "Pharmacy reactivated", description: pharmacy.name });
      await load();
    } catch (statusError) {
      toast({ type: "danger", title: "Unable to update status", description: statusError instanceof Error ? statusError.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const resetOwnerPassword = async () => {
    if (!pharmacy) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/control/reset-owner-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pharmacyId: pharmacy.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not reset the password.");
      setCredentials({ email: payload.email, password: payload.password });
    } catch (resetError) {
      toast({ type: "danger", title: "Unable to reset password", description: resetError instanceof Error ? resetError.message : "Please try again." });
    } finally {
      setBusy(false);
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

  if (!ready || user?.role !== "super_admin" || (loading && !notFound)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900 text-navy-300">
        <ShieldCheck className="h-6 w-6 animate-pulse" />
      </div>
    );
  }

  const expired = !!pharmacy?.subscription_expiry && pharmacy.subscription_expiry < todayIso();
  const owner = members.find((m) => m.role === "admin");
  const staff = members.filter((m) => m.role !== "admin");

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/control" className="inline-flex items-center gap-2 text-sm text-navy-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to pharmacies
          </Link>
          <div className="flex items-center gap-2 text-xs text-navy-400">
            <ShieldCheck className="h-4 w-4" /> Super Admin
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {notFound || !pharmacy ? (
          <div className="rounded-xl border border-white/10 bg-navy-800 p-6">
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Pharmacy not found"
              description="It may have been deleted. Go back to the list."
              action={<Link href="/control"><Button variant="outline">Back to pharmacies</Button></Link>}
            />
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-navy-800 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                  {pharmacy.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pharmacy.logo_url} alt={pharmacy.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-navy-400" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{pharmacy.name}</h1>
                    {pharmacy.status === "suspended" ? (
                      <Badge tone="danger">suspended</Badge>
                    ) : expired ? (
                      <Badge tone="warning">expired</Badge>
                    ) : (
                      <Badge tone="success">active</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-navy-400">Registered {formatDate(pharmacy.created_at)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" size="sm" loading={busy} onClick={resetOwnerPassword}>
                  <KeyRound className="h-4 w-4" /> Password
                </Button>
                {pharmacy.status === "active" ? (
                  <Button variant="outline" size="sm" loading={busy} onClick={() => setStatus("suspended")}>
                    <Ban className="h-4 w-4" /> Suspend
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" loading={busy} onClick={() => setStatus("active")}>
                    <RotateCcw className="h-4 w-4" /> Reactivate
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={() => setDeleting(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>

            {/* Subscription */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InfoCard icon={<Wallet className="h-5 w-5" />} label="Subscription price" value={formatRs(pharmacy.subscription_price)} />
              <InfoCard icon={<CalendarClock className="h-5 w-5" />} label="Start date" value={pharmacy.subscription_start ? formatDate(pharmacy.subscription_start) : "—"} />
              <InfoCard
                icon={<CalendarClock className="h-5 w-5" />}
                label="Expiry date"
                value={pharmacy.subscription_expiry ? formatDate(pharmacy.subscription_expiry) : "No expiry"}
                tone={expired ? "danger" : undefined}
              />
            </div>

            {/* Owner */}
            <div className="mt-5 rounded-xl border border-white/10 bg-navy-800 p-5">
              <p className="text-xs uppercase tracking-wide text-navy-400">Owner</p>
              {owner ? (
                <div className="mt-2">
                  <p className="font-semibold text-white">{owner.name}</p>
                  <p className="text-sm text-navy-300">{owner.email}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-navy-400">Owner account not found.</p>
              )}
            </div>

            {/* Team */}
            <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-navy-800">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                <Users className="h-4 w-4 text-navy-400" />
                <p className="text-sm font-semibold">Team members ({members.length})</p>
              </div>
              {members.length === 0 ? (
                <div className="p-6 text-center text-sm text-navy-400">No members.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-navy-400">
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Email</th>
                        <th className="px-5 py-3 font-medium">Role</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Last login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(owner ? [owner] : []), ...staff].map((m) => (
                        <tr key={m.id} className="border-b border-white/5 last:border-0">
                          <td className="px-5 py-3 font-medium text-white">{m.name}</td>
                          <td className="px-5 py-3 text-navy-300">{m.email}</td>
                          <td className="px-5 py-3">
                            <Badge tone={m.role === "admin" ? "primary" : "navy"}>{m.role === "admin" ? "Owner" : m.role}</Badge>
                          </td>
                          <td className="px-5 py-3">
                            <Badge tone={m.status === "active" ? "success" : "danger"}>{m.status}</Badge>
                          </td>
                          <td className="px-5 py-3 text-navy-400">{m.last_login ? formatDate(m.last_login) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {editing && pharmacy && (
        <PharmacyEditModal pharmacy={pharmacy} onClose={() => setEditing(false)} onSaved={load} />
      )}

      {deleting && pharmacy && (
        <PharmacyDeleteModal
          pharmacy={pharmacy}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.replace("/control")}
        />
      )}

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
    </div>
  );
}

function InfoCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-800 p-4">
      <div className="flex items-center gap-2 text-navy-400">
        {icon}
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-1.5 text-lg font-bold ${tone === "danger" ? "text-danger-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
