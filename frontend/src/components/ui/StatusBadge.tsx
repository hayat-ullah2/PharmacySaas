import { Badge, type BadgeTone } from "./Badge";

const map: Record<string, { label: string; tone: BadgeTone }> = {
  // stock
  healthy: { label: "Healthy", tone: "success" },
  low: { label: "Low Stock", tone: "warning" },
  expiring: { label: "Expiring Soon", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
  out: { label: "Out of Stock", tone: "danger" },
  // generic active
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "navy" },
  // sales
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "navy" },
  partial: { label: "Partial", tone: "info" },
  // purchases
  draft: { label: "Draft", tone: "navy" },
  ordered: { label: "Ordered", tone: "info" },
  received: { label: "Received", tone: "success" },
  returned: { label: "Returned", tone: "navy" },
  cancelled: { label: "Cancelled", tone: "danger" },
  // prescriptions
  approved: { label: "Approved", tone: "info" },
  dispensed: { label: "Dispensed", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  // payments
  completed: { label: "Completed", tone: "success" },
  incoming: { label: "Incoming", tone: "success" },
  outgoing: { label: "Outgoing", tone: "warning" },
};

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  const meta = map[status] ?? { label: status, tone: "navy" as BadgeTone };
  return (
    <Badge tone={meta.tone} dot={dot}>
      {meta.label}
    </Badge>
  );
}
