import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Boxes,
  FileText,
  Pill,
  Tags,
  Award,
  Factory,
  Layers,
  Users,
  Building2,
  Wallet,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  PieChart,
  ShieldCheck,
  Bell,
  ScrollText,
  Settings,
  Store,
  RotateCcw,
  UserCircle,
} from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  links: NavLink[];
}

export const ADMIN_NAV: NavSection[] = [
  {
    links: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Operations",
    links: [
      { label: "Sales", href: "/admin/sales", icon: ShoppingCart },
      { label: "Purchases", href: "/admin/purchases", icon: Truck },
      { label: "Inventory", href: "/admin/inventory", icon: Boxes },
      { label: "Prescriptions", href: "/admin/prescriptions", icon: FileText },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "Medicines", href: "/admin/medicines", icon: Pill },
      { label: "Categories", href: "/admin/categories", icon: Tags },
      { label: "Brands", href: "/admin/brands", icon: Award },
      { label: "Manufacturers", href: "/admin/manufacturers", icon: Factory },
      { label: "Batches", href: "/admin/batches", icon: Layers },
    ],
  },
  {
    title: "People",
    links: [
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Suppliers", href: "/admin/suppliers", icon: Building2 },
    ],
  },
  {
    title: "Finance",
    links: [
      { label: "Payments", href: "/admin/finance/payments", icon: Wallet },
      { label: "Expenses", href: "/admin/finance/expenses", icon: Receipt },
      { label: "Receivables", href: "/admin/finance/receivables", icon: ArrowDownToLine },
      { label: "Payables", href: "/admin/finance/payables", icon: ArrowUpFromLine },
    ],
  },
  {
    title: "Reports",
    links: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Analytics", href: "/admin/reports/profit", icon: PieChart },
    ],
  },
  {
    title: "Administration",
    links: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Managers only get POS/selling tools — no inventory, suppliers, reports, or admin.
export const MANAGER_NAV: NavSection[] = [
  {
    links: [
      { label: "Home", href: "/manager", icon: LayoutDashboard },
      { label: "Pharmacy Store", href: "/manager/store", icon: Store },
    ],
  },
  {
    title: "Selling",
    links: [
      { label: "Sales", href: "/manager/sales", icon: ShoppingCart },
      { label: "Returns", href: "/manager/returns", icon: RotateCcw },
      { label: "Prescriptions", href: "/manager/prescriptions", icon: FileText },
    ],
  },
  {
    title: "People",
    links: [
      { label: "Customers", href: "/manager/customers", icon: Users },
      { label: "My Profile", href: "/manager/profile", icon: UserCircle },
    ],
  },
];
