"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ADMIN_NAV, MANAGER_NAV } from "@/lib/nav";
import { ManagerBottomNav } from "./ManagerBottomNav";
import { usePharmacyData } from "@/lib/pharmacyData";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary-600 text-white">
          <Pill className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-navy-500">Loading MediCare…</p>
      </div>
    </div>
  );
}

export function AppShell({
  variant,
  children,
}: {
  variant: "admin" | "manager";
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const { ready: dataReady, revision, error: dataError, reload } = usePharmacyData();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Role-based route protection
    if (user.role === "super_admin") {
      router.replace("/control");
    } else if (variant === "admin" && user.role !== "admin") {
      router.replace("/manager/store");
    } else if (variant === "manager" && user.role !== "manager") {
      router.replace("/admin/dashboard");
    }
  }, [ready, user, variant, router]);

  if (dataError && user && !dataReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
        <div className="max-w-lg rounded-xl border border-danger-200 bg-white p-6 text-center shadow-card">
          <h1 className="text-lg font-semibold text-navy-900">Unable to load pharmacy data</h1>
          <p className="mt-2 text-sm text-danger-700">{dataError}</p>
          <button
            type="button"
            onClick={() => void reload().catch(() => undefined)}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!ready || !dataReady || !user || user.role !== variant) {
    return <FullScreenLoader />;
  }

  const sections = variant === "admin" ? ADMIN_NAV : MANAGER_NAV;

  return (
    <div className="flex min-h-screen bg-navy-50/60">
      <Sidebar
        sections={sections}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={variant}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} variant={variant} />
        <main
          className={
            variant === "manager"
              ? "flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-6"
              : "flex-1 px-4 py-5 lg:px-6"
          }
        >
          {dataError && (
            <div role="alert" className="mx-auto mb-4 flex max-w-7xl flex-col gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing saved pharmacy data, but the latest refresh failed: {dataError}</span>
              <button
                type="button"
                onClick={() => void reload().catch(() => undefined)}
                className="shrink-0 font-semibold underline"
              >
                Retry refresh
              </button>
            </div>
          )}
          <div key={revision} className="mx-auto max-w-7xl">{children}</div>
        </main>
        {variant === "manager" && <ManagerBottomNav />}
      </div>
    </div>
  );
}
