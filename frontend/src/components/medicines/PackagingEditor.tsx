"use client";

import { useState } from "react";
import { Plus, Trash2, Layers, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { PRODUCT_TYPES } from "@/lib/units";
import { formatRs } from "@/lib/utils";
import type { MedicineUnit } from "@/lib/types";

/**
 * Optional multi-unit packaging editor. Collapsed by default so single-unit
 * products (syrup by bottle, cream by tube) stay simple. When the owner adds
 * packs, inventory still counts in BASE units; each pack just has a factor
 * (how many base units it contains) and its own price.
 */
export function PackagingEditor({
  baseUnit,
  basePrice,
  productType,
  packUnits,
  allowLoose,
  onProductType,
  onPackUnits,
  onAllowLoose,
}: {
  baseUnit: string;
  basePrice: number;
  productType: string;
  packUnits: MedicineUnit[];
  allowLoose: boolean;
  onProductType: (v: string) => void;
  onPackUnits: (v: MedicineUnit[]) => void;
  onAllowLoose: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(packUnits.length > 0);
  const base = baseUnit || "unit";

  const addPack = () => onPackUnits([...packUnits, { name: "", factor: 10, price: 0 }]);
  const updatePack = (i: number, patch: Partial<MedicineUnit>) =>
    onPackUnits(packUnits.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removePack = (i: number) => onPackUnits(packUnits.filter((_, idx) => idx !== i));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); if (packUnits.length === 0) addPack(); }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-navy-200 bg-navy-50/50 px-3 py-2.5 text-sm font-medium text-navy-600 transition hover:bg-navy-50"
      >
        <Layers className="h-4 w-4" /> Configure packaging (strips, boxes, cartons…)
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-navy-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Layers className="h-4 w-4 text-primary-600" /> Packaging &amp; unit pricing
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Collapse" className="rounded p-1 text-navy-400 hover:text-navy-700">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-1 text-xs text-navy-500">
        Inventory is counted in <span className="font-medium text-navy-700">{base}</span> (the base unit, {formatRs(basePrice)} loose).
        Add larger packs with how many {base} each contains and its own price.
      </p>

      <div className="mt-3 sm:max-w-xs">
        <Select
          label="Product type (optional)"
          value={productType}
          onChange={(e) => onProductType(e.target.value)}
          placeholder="Select type"
          options={PRODUCT_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>

      {/* Base unit row (read-only) */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm">
        <span className="font-medium text-navy-800">{base}</span>
        <span className="text-xs text-navy-400">base unit · 1 {base}</span>
        <span className="ml-auto font-semibold text-navy-900">{formatRs(basePrice)}</span>
      </div>

      {/* Pack rows */}
      <div className="mt-2 space-y-2">
        {packUnits.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <Input label={i === 0 ? "Pack name" : undefined} placeholder="e.g. Strip" value={p.name} onChange={(e) => updatePack(i, { name: e.target.value })} />
            <Input
              label={i === 0 ? `Contains (${base})` : undefined}
              type="number"
              min={2}
              step={1}
              placeholder="10"
              value={p.factor || ""}
              onChange={(e) => updatePack(i, { factor: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
            />
            <Input
              label={i === 0 ? "Price (Rs)" : undefined}
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              value={p.price || ""}
              onChange={(e) => updatePack(i, { price: Number(e.target.value) || 0 })}
            />
            <button type="button" onClick={() => removePack(i)} aria-label="Remove pack" className="mb-1 flex h-10 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-danger-50 hover:text-danger-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addPack} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
        <Plus className="h-4 w-4" /> Add pack
      </button>

      {/* Live preview */}
      {packUnits.some((p) => p.factor > 1) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {packUnits.filter((p) => p.factor > 1 && p.name.trim()).map((p, i) => (
            <span key={i} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              1 {p.name.trim()} = {p.factor} {base}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-navy-100 pt-3">
        <Toggle label={`Allow selling a single ${base} (loose)`} checked={allowLoose} onChange={onAllowLoose} />
      </div>
    </div>
  );
}
