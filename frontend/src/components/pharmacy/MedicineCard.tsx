"use client";

import Link from "next/link";
import { Pill, Plus, ShieldAlert, Check } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { posUnits, baseUnit, unitPriceLabel } from "@/lib/units";
import { useToast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { formatRs, cn } from "@/lib/utils";
import type { Medicine, MedicineUnit } from "@/lib/types";

export function MedicineCard({ medicine }: { medicine: Medicine }) {
  const { addItem, saleType } = useCart();
  const { toast } = useToast();
  const [added, setAdded] = useState(false);
  // Units offered depend on the sale mode. Wholesale = packs with a wholesale
  // price (charged at wholesale); retail = all sellable units at retail.
  const modeUnits = posUnits(medicine, saleType);
  // Only offer units we can make at least 1 of from current stock (a Carton needs 1000).
  const units = modeUnits.filter((u) => Math.floor(medicine.stock / Math.max(1, u.factor)) >= 1);
  const noWholesale = saleType === "wholesale" && modeUnits.length === 0;
  const outOfStock = medicine.stock <= 0 || noWholesale || units.length === 0;
  const lowStock = medicine.stock > 0 && medicine.stock <= medicine.reorderLevel;

  // Wholesale defaults to the largest pack (box/carton); retail to the smallest.
  const defaultUnit = (saleType === "wholesale" ? units[0] : units[units.length - 1]) ?? baseUnit(medicine);
  const [sel, setSel] = useState<MedicineUnit>(defaultUnit);
  // Re-default the unit when the selling mode flips (adjust state during render).
  const [seenMode, setSeenMode] = useState(saleType);
  if (seenMode !== saleType) {
    setSeenMode(saleType);
    setSel(defaultUnit);
  }
  const maxOfSel = Math.floor(medicine.stock / Math.max(1, sel.factor));
  const href = `/manager/products/${medicine.id}`;

  const add = () => {
    if (outOfStock) return;
    addItem(medicine, sel, 1);
    setAdded(true);
    toast({ type: "success", title: "Added to cart", description: `1 ${sel.name} · ${medicine.name}` });
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-navy-200/70 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      {/* Image → details */}
      <Link href={href} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 to-navy-50">
        {medicine.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={medicine.image}
            alt={medicine.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <Pill className="h-14 w-14 text-primary-200 transition-transform group-hover:scale-110" />
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {medicine.prescriptionRequired && (
            <Badge tone="danger" className="shadow-sm"><ShieldAlert className="h-3 w-3" /> Rx</Badge>
          )}
        </div>
        {outOfStock ? (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-danger-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            Out of stock
          </span>
        ) : lowStock ? (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-warning-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            Low stock
          </span>
        ) : null}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={href} className="block">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary-600">{medicine.category}</p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-navy-900">{medicine.name}</h3>
          <p className="truncate text-xs text-navy-400">{medicine.genericName} · {medicine.strength}</p>
        </Link>

        {/* Unit picker (only when the medicine has packs) */}
        {units.length > 1 && !outOfStock && (
          <select
            aria-label="Sell by unit"
            value={sel.name}
            onChange={(e) => { const u = units.find((x) => x.name === e.target.value); if (u) setSel(u); }}
            className="mt-2 h-8 w-full appearance-none rounded-lg border border-navy-200 bg-white px-2 text-xs font-medium text-navy-700 focus:border-primary-500 focus:outline-none"
          >
            {units.map((u) => (
              <option key={u.name} value={u.name}>
                {unitPriceLabel(u, medicine.unit)}
              </option>
            ))}
          </select>
        )}

        <div className="mt-2.5 flex items-end justify-between">
          <div>
            <p className="text-base font-bold text-navy-900">{formatRs(sel.price)}</p>
            <p className={cn("text-[11px]", outOfStock ? "text-danger-500" : lowStock ? "text-warning-600" : "text-navy-400")}>
              {noWholesale ? "No wholesale price set" : outOfStock ? "0 in stock" : `${maxOfSel} ${sel.name}${maxOfSel === 1 ? "" : "s"} in stock`}
            </p>
          </div>
          <button
            onClick={add}
            disabled={outOfStock}
            aria-label={`Add ${medicine.name} to cart`}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition",
              outOfStock
                ? "cursor-not-allowed bg-navy-100 text-navy-300"
                : added
                  ? "bg-success-600 text-white"
                  : "bg-primary-600 text-white hover:bg-primary-700",
            )}
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
