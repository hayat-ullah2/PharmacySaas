"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { deriveAlerts } from "@/lib/alerts";
import { Dropdown } from "@/components/ui/Dropdown";
import { initials, cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";

const typeDot: Record<string, string> = {
  info: "bg-info-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  success: "bg-success-500",
};

export function Header({
  onMenuClick,
  variant,
}: {
  onMenuClick: () => void;
  variant: "admin" | "manager";
}) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { totals } = useCart();
  // Alerts are inventory/prescription-driven — relevant to owners, not the POS.
  const alerts = variant === "admin" ? deriveAlerts() : [];
  const unread = alerts.length;
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (logoutError) {
      toast({
        type: "danger",
        title: "Unable to log out",
        description: logoutError instanceof Error ? logoutError.message : "Please try again.",
      });
    }
  };


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy-200 bg-white/90 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-lg p-2 text-navy-500 hover:bg-navy-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {variant === "manager" && (
          <Link
            href="/manager/cart"
            aria-label="View cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-navy-500 transition hover:bg-navy-100"
          >
            <ShoppingCart className="h-5 w-5" />
            {totals.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                {totals.count}
              </span>
            )}
          </Link>
        )}

        {/* Notifications — live derived alerts, owner-facing only */}
        {variant === "admin" && (
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-navy-500 transition hover:bg-navy-100"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
              )}
            </button>
            {notifOpen && (
              <div className="animate-scale-in absolute right-0 z-50 mt-1.5 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-navy-200 bg-white shadow-pop">
                <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
                  <p className="text-sm font-semibold text-navy-900">Alerts</p>
                  {unread > 0 && (
                    <span className="rounded-full bg-danger-50 px-1.5 py-0.5 text-[10px] font-semibold text-danger-600">
                      {unread} active
                    </span>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-navy-400">You&apos;re all caught up.</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {alerts.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={n.href}
                          onClick={() => setNotifOpen(false)}
                          className="flex gap-3 border-b border-navy-50 px-4 py-3 last:border-0 hover:bg-navy-50/50"
                        >
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", typeDot[n.type])} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-navy-800">{n.title}</p>
                            <p className="text-xs text-navy-500">{n.message}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/admin/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="block border-t border-navy-100 px-4 py-2.5 text-center text-xs font-medium text-primary-600 hover:bg-navy-50"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        )}

        {/* User menu */}
        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-navy-100">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: variant === "admin" ? "#6366f1" : "#10b981" }}
              >
                {user ? initials(user.name) : "U"}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold text-navy-900">
                  {user?.name ?? "User"}
                </span>
                <span className="block text-[11px] capitalize text-navy-400">
                  {user?.pharmacyName ?? user?.role}
                </span>
              </span>
            </button>
          }
          items={[
            {
              label: "My Profile",
              icon: <UserCircle className="h-4 w-4" />,
              onClick: () =>
                router.push(variant === "admin" ? "/admin/settings" : "/manager/profile"),
            },
            {
              label: "Settings",
              icon: <Settings className="h-4 w-4" />,
              onClick: () =>
                router.push(variant === "admin" ? "/admin/settings" : "/manager/profile"),
            },
            { label: "", divider: true },
            {
              label: "Log out",
              icon: <LogOut className="h-4 w-4" />,
              danger: true,
              onClick: handleLogout,
            },
          ]}
        />
      </div>
    </header>
  );
}
