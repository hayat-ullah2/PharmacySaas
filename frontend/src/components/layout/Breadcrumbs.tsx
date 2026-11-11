import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="text-navy-500 transition-colors hover:text-primary-600"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={last ? "font-medium text-navy-800" : "text-navy-500"}
                aria-current={last ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5 text-navy-300" />}
          </span>
        );
      })}
    </nav>
  );
}
