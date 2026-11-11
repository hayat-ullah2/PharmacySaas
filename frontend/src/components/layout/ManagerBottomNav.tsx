"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, ShoppingCart, FileText, Receipt } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: "/manager", icon: LayoutDashboard },
  { label: "Store", href: "/manager/store", icon: Store },
  { label: "Cart", href: "/manager/cart", icon: ShoppingCart, cart: true },
  { label: "Sales", href: "/manager/sales", icon: Receipt },
  { label: "Rx", href: "/manager/prescriptions", icon: FileText },
];

export function ManagerBottomNav() {
  const pathname = usePathname();
  const { totals } = useCart();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-navy-200 bg-white/95 backdrop-blur-md lg:hidden">
      {items.map((item) => {
        const active =
          item.href === "/manager"
            ? pathname === "/manager"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-primary-600" : "text-navy-400",
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {item.cart && totals.count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-bold text-white">
                  {totals.count}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
