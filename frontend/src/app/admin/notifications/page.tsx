"use client";

import Link from "next/link";
import { Bell, Info, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { deriveAlerts, type AlertItem } from "@/lib/alerts";

const typeMeta: Record<AlertItem["type"], { icon: typeof Info; wrap: string; color: string }> = {
  info: { icon: Info, wrap: "bg-info-50", color: "text-info-600" },
  warning: { icon: AlertTriangle, wrap: "bg-warning-50", color: "text-warning-600" },
  danger: { icon: XCircle, wrap: "bg-danger-50", color: "text-danger-600" },
};

export default function NotificationsPage() {
  const alerts = deriveAlerts();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Live alerts generated from your pharmacy's stock and prescriptions."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Notifications" }]}
      />

      <Card>
        {alerts.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="All caught up"
            description="No alerts right now — stock and prescriptions are in good shape."
          />
        ) : (
          <ul className="divide-y divide-navy-100">
            {alerts.map((n) => {
              const m = typeMeta[n.type];
              const Icon = m.icon;
              return (
                <li key={n.id}>
                  <Link href={n.href} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-navy-50/40">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.wrap} ${m.color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                      <p className="mt-0.5 text-sm text-navy-600">{n.message}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-navy-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
