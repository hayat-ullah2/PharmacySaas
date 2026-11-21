"use client";

import { useState } from "react";
import { Plus, Trash2, Layers, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { PRODUCT_TYPES, resolvePackUnits } from "@/lib/units";
import { PACK_UNIT_NAMES } from "@/lib/medicineOptions";
import { formatRs } from "@/lib/utils";
import type { MedicineUnit } from "@/lib/types";

/**
 * Multi-unit packaging editor with NESTED packs: each pack is defined as
 * "1 {name} = {contains} {of}", where `of` is the base unit or a smaller pack
 * (e.g. 1 Box = 10 Strip, 1 Strip = 10 Tablet ⇒ 1 Box = 100 Tablet). Inventory
 * still counts in BASE units; each pack's resolved `factor` (base units per
 * pack) is the single source of truth used by purchases / batches / POS.
 */
export function PackagingEditor({
  baseUnit,
  basePrice,
  productType,
  packUnits,
  allowLoose,
  allowWholesale = true,
  onProductType,
  onPackUnits,
  onAllowLoose,
  onAllowWholesale,
}: {
  baseUnit: string;
  basePrice: number;
  productType: string;
  packUnits: MedicineUnit[];
  allowLoose: boolean;
  allowWholesale?: boolean;
  onProductType: (v: string) => void;
  onPackUnits: (v: MedicineUnit[]) => void;
  onAllowLoose: (v: boolean) => void;
  onAllowWholesale?: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(packUnits.length > 0);
  const base = baseUnit || "unit";

  // Always store packs with their factor resolved from the nested definition.
  const apply = (next: MedicineUnit[]) => onPackUnits(resolvePackUnits(next, base));
  const addPack = () => apply([...packUnits, { name: "", contains: 10, of: "", factor: 0, price: 0 }]);
  const updatePack = (i: number, patch: Partial<MedicineUnit>) =>
    apply(packUnits.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removePack = (i: number) => apply(packUnits.filter((_, idx) => idx !== i));

  // Pack-name options (common names + any existing custom name).
  const nameOptions = (current: string) => {
    const names = [...PACK_UNIT_NAMES];
    if (current && !names.some((n) => n.toLowerCase() === current.toLowerCase())) names.unshift(current);
    return names.map((n) => ({ value: n, label: n }));
  };
  // What a pack can be built from: the base unit, or any OTHER named pack.
  const ofOptions = (i: number) => [
    { value: "", label: `${base} (base)` },
    ...packUnits
      .filter((p, idx) => idx !== i && (p.name ?? "").trim())
      .map((p) => ({ value: p.name.trim(), label: p.name.trim() })),
  ];
  const ofLabel = (p: MedicineUnit) => ((p.of ?? "").trim() ? p.of!.trim() : base);

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
        The base unit <span className="font-medium text-navy-700">{base}</span> and its price are set above in
        <span className="font-medium text-navy-700"> Pricing &amp; Stock</span>. Here you add larger packs — each with
        its own <span className="font-medium text-navy-700">Retail</span> and <span className="font-medium text-navy-700">Wholesale</span> price.
        e.g. 1 Strip = 10 {base}, 1 Carton = 100 Strip.
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

      {/* Pack cards: hierarchy (name/contains/of) + its own retail & wholesale prices */}
      <div className="mt-3 space-y-2">
        {packUnits.map((p, i) => (
          <div key={i} className="rounded-lg border border-navy-100 p-3">
            <div className="grid grid-cols-[1.2fr_0.7fr_1fr_auto] items-end gap-2">
              <Select label="Pack name" placeholder="Select pack" value={p.name} onChange={(e) => updatePack(i, { name: e.target.value })} options={nameOptions(p.name)} />
              <Input label="Contains" type="number" min={2} step={1} placeholder="10" value={p.contains ?? p.factor ?? ""} onChange={(e) => updatePack(i, { contains: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
              <Select label="of" value={p.of ?? ""} onChange={(e) => updatePack(i, { of: e.target.value })} options={ofOptions(i)} />
              <button type="button" onClick={() => removePack(i)} aria-label="Remove pack" className="mb-1 flex h-10 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-danger-50 hover:text-danger-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Input label="Retail price (Rs)" type="number" min={0} step="0.01" placeholder="0" value={p.price || ""} onChange={(e) => updatePack(i, { price: Number(e.target.value) || 0 })} />
              <Input label="Wholesale price (Rs)" type="number" min={0} step="0.01" placeholder="0" value={p.wholesalePrice ?? ""} onChange={(e) => updatePack(i, { wholesalePrice: e.target.value === "" ? undefined : Number(e.target.value) || 0 })} />
              <Input label="Min wholesale qty" type="number" min={1} step={1} placeholder="optional" value={p.minWholesaleQty ?? ""} onChange={(e) => updatePack(i, { minWholesaleQty: e.target.value === "" ? undefined : Math.max(1, Math.floor(Number(e.target.value) || 0)) })} />
            </div>
            {(p.name ?? "").trim() && p.factor > 1 ? (
              <p className="mt-1.5 text-[11px] text-primary-600">
                1 {p.name.trim()} = {p.contains ?? p.factor} {ofLabel(p)}{ofLabel(p) !== base ? ` = ${p.factor} ${base}` : ""}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <button type="button" onClick={addPack} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
        <Plus className="h-4 w-4" /> Add another package
      </button>

      {/* Live packaging summary — conversion + retail/wholesale price per level */}
      {(() => {
        const levels = packUnits.filter((p) => (p.name ?? "").trim() && p.factor > 1).sort((a, b) => a.factor - b.factor);
        if (levels.length === 0) return null;
        return (
          <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/40 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary-700">Packaging summary</p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-navy-600">1 {base} <span className="text-navy-400">(base · retail)</span></span>
                <span className="font-semibold text-navy-900">{formatRs(basePrice)}</span>
              </li>
              {levels.map((p, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="text-navy-600">
                    1 {p.name.trim()} = {p.contains ?? p.factor} {ofLabel(p)}
                    {ofLabel(p) !== base ? ` = ${p.factor} ${base}` : ""}
                  </span>
                  <span className="shrink-0 font-semibold text-navy-900">
                    {formatRs(p.price)}
                    <span className="font-normal text-navy-400"> retail</span>
                    {(p.wholesalePrice ?? 0) > 0 ? <> · {formatRs(p.wholesalePrice!)}<span className="font-normal text-navy-400"> wholesale</span></> : <span className="font-normal text-warning-600"> · no wholesale price</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="mt-4 space-y-3 border-t border-navy-100 pt-3">
        <div>
          <Toggle label={`Allow retail / partial sales (single ${base})`} checked={allowLoose} onChange={onAllowLoose} />
          <p className="mt-1 text-xs text-navy-400">
            Turn off for medicines that must be sold in a full pack (e.g. antibiotics, injections).
          </p>
        </div>
        <div>
          <Toggle label="Allow wholesale sales (full packs)" checked={allowWholesale} onChange={(v) => onAllowWholesale?.(v)} />
          <p className="mt-1 text-xs text-navy-400">
            When off, this medicine is hidden from the POS wholesale mode.
          </p>
        </div>
      </div>
    </div>
  );
}
