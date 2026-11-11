"use client";

import { MEDICINES, BATCHES, PRESCRIPTIONS } from "./data";

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  type: "warning" | "danger" | "info";
  href: string;
}

/** Live, derived alerts computed from the signed-in pharmacy's own data. */
export function deriveAlerts(): AlertItem[] {
  const meds = [...MEDICINES];
  const batches = [...BATCHES];
  const lowStock = meds.filter((m) => m.status === "low" || m.status === "out").length;
  const expiring = batches.filter((b) => b.status === "expiring").length;
  const expired = batches.filter((b) => b.status === "expired").length;
  const pendingRx = [...PRESCRIPTIONS].filter((p) => p.status === "pending").length;

  const alerts: AlertItem[] = [];
  if (expired) alerts.push({ id: "expired", title: "Expired stock", message: `${expired} batch(es) are expired and must be removed.`, type: "danger", href: "/admin/inventory/expired" });
  if (lowStock) alerts.push({ id: "low", title: "Low stock", message: `${lowStock} medicine(s) are at or below reorder level.`, type: "warning", href: "/admin/inventory/low-stock" });
  if (expiring) alerts.push({ id: "expiring", title: "Batches expiring", message: `${expiring} batch(es) expire within 90 days.`, type: "warning", href: "/admin/inventory/expiring" });
  if (pendingRx) alerts.push({ id: "rx", title: "Prescriptions pending", message: `${pendingRx} prescription(s) await review.`, type: "info", href: "/admin/prescriptions" });
  return alerts;
}
