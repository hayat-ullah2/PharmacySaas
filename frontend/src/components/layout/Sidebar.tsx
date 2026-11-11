"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pill, X } from "lucide-react";
import type { NavSection } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/manager") return pathname === "/manager";
  if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  sections,
  open,
  onClose,
  variant,
}: {
  sections: NavSection[];
  open: boolean;
  onClose: () => void;
  variant: "admin" | "manager";
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const brandName = user?.pharmacyName?.trim() || "MediCare";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-navy-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-navy-100 px-5">
          <Link href={variant === "admin" ? "/admin/dashboard" : "/manager"} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-600 text-white shadow-sm">
              {user?.pharmacyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.pharmacyLogo} alt={brandName} className="h-full w-full object-cover" />
              ) : (
                <Pill className="h-5 w-5" />
              )}
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[15px] font-bold tracking-tight text-navy-900">
                {brandName}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-navy-400">
                {variant === "admin" ? "ERP Control Center" : "Pharmacy POS"}
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, i) => (
            <div key={i} className={cn(i > 0 && "mt-5")}>
              {section.title && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-navy-400">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.links.map((link) => {
                  const active = isActive(pathname, link.href);
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary-50 text-primary-700"
                            : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active
                              ? "text-primary-600"
                              : "text-navy-400 group-hover:text-navy-600",
                          )}
                        />
                        <span className="truncate">{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
}
