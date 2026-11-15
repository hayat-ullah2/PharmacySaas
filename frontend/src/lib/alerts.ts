"use client";

import { MEDICINES, BATCHES, PRESCRIPTIONS } from "./data";
import { formatDate } from "./utils";

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  type: "warning" | "danger" | "info";
  href: string;
}

// Show at most this many individual items per category; the rest roll up into a
// single "+N more" alert linking to the relevant page.
const PER_CATEGORY = 8;

/**
 * Live, derived alerts computed from the signed-in pharmacy's own data. Each
 * low-stock medicine and each expiring/expired batch is its own clickable
 * notification that deep-links to the item (medicine detail) or its list.
 */
export function deriveAlerts(): AlertItem[] {
  const meds = [...MEDICINES];
  const batches = [...BATCHES];
  const alerts: AlertItem[] = [];

  // 1) Expired batches that still hold stock — most urgent, must be pulled.
  const expired = batches
    .filter((b) => b.status === "expired" && (b.remaining ?? 0) > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  expired.slice(0, PER_CATEGORY).forEach((b) =>
    alerts.push({
      id: `expired-${b.id}`,
      title: `${b.medicineName} — expired`,
      message: `Batch ${b.batchNumber} expired ${formatDate(b.expiryDate)} · ${b.remaining} left. Remove from sale.`,
      type: "danger",
      href: "/admin/inventory/expired",
    }),
  );
  if (expired.length > PER_CATEGORY)
    alerts.push({ id: "expired-more", title: `+${expired.length - PER_CATEGORY} more expired batches`, message: "Review all expired stock.", type: "danger", href: "/admin/inventory/expired" });

  // 2) Out-of-stock + low-stock medicines (out first, then deepest below reorder).
  const low = meds
    .filter((m) => !m.archived && (m.status === "out" || m.status === "low"))
    .sort((a, b) => {
      if ((a.status === "out") !== (b.status === "out")) return a.status === "out" ? -1 : 1;
      return a.stock - a.reorderLevel - (b.stock - b.reorderLevel);
    });
  low.slice(0, PER_CATEGORY).forEach((m) =>
    alerts.push({
      id: `low-${m.id}`,
      title: m.status === "out" ? `${m.name} ${m.strength} — out of stock` : `${m.name} ${m.strength} — low stock`,
      message: `${m.stock} ${m.unit} left · reorder at ${m.reorderLevel}.`,
      type: m.status === "out" ? "danger" : "warning",
      href: `/admin/medicines/${m.id}`,
    }),
  );
  if (low.length > PER_CATEGORY)
    alerts.push({ id: "low-more", title: `+${low.length - PER_CATEGORY} more low / out of stock`, message: "Review all low-stock items.", type: "warning", href: "/admin/inventory/low-stock" });

  // 3) Batches expiring within 90 days (soonest first).
  const expiring = batches
    .filter((b) => b.status === "expiring" && (b.remaining ?? 0) > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  expiring.slice(0, PER_CATEGORY).forEach((b) =>
    alerts.push({
      id: `expiring-${b.id}`,
      title: `${b.medicineName} — expiring soon`,
      message: `Batch ${b.batchNumber} expires ${formatDate(b.expiryDate)} · ${b.remaining} left.`,
      type: "warning",
      href: "/admin/inventory/expiring",
    }),
  );
  if (expiring.length > PER_CATEGORY)
    alerts.push({ id: "expiring-more", title: `+${expiring.length - PER_CATEGORY} more expiring batches`, message: "Review all expiring stock.", type: "warning", href: "/admin/inventory/expiring" });

  // 4) Pending prescriptions — single summary.
  const pendingRx = [...PRESCRIPTIONS].filter((p) => p.status === "pending").length;
  if (pendingRx)
    alerts.push({ id: "rx", title: "Prescriptions pending", message: `${pendingRx} prescription(s) await review.`, type: "info", href: "/admin/prescriptions" });

  return alerts;
}
