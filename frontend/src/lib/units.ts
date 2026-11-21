import type { Medicine, MedicineUnit } from "./types";
import { formatRs } from "./utils";

/** Per-base-unit equivalent price (may be fractional, e.g. Rs 9.5) — up to 2 dp, no trailing zeros. */
function perUnitRs(n: number): string {
  return `Rs ${n.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

/**
 * Dropdown label for a sellable unit: its own price, plus (for packs) how many
 * base units it holds AND the per-base-unit equivalent price.
 * e.g. "Carton — Rs 10,000 (1000 Tablet · Rs 10/Tablet)".
 */
export function unitPriceLabel(u: MedicineUnit, baseName: string): string {
  if (u.factor > 1) {
    return `${u.name} — ${formatRs(u.price)} (${u.factor} ${baseName} · ${perUnitRs(u.price / u.factor)}/${baseName})`;
  }
  return `${u.name} — ${formatRs(u.price)}`;
}

// Product types (guidance only — drives sensible packaging defaults in the UI).
export const PRODUCT_TYPES = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Injection",
  "Drops",
  "Inhaler",
  "Spray",
  "Cream",
  "Ointment",
  "Sachet",
  "Supply",
  "Other",
];

type UnitSource = Pick<Medicine, "unit" | "sellingPrice" | "packUnits" | "allowLoose">;

/** The base (smallest) sellable/inventory unit — always factor 1, priced as the loose price. */
export function baseUnit(m: UnitSource): MedicineUnit {
  return { name: m.unit || "Unit", factor: 1, price: m.sellingPrice };
}

/**
 * All units a cashier can pick, largest pack first. The loose base unit is only
 * included when loose selling is allowed. Inventory is always counted in base units.
 */
export function sellableUnits(m: UnitSource): MedicineUnit[] {
  const packs = (m.packUnits ?? []).filter((u) => u && u.factor > 1);
  const list = [...packs];
  if (m.allowLoose !== false) list.push(baseUnit(m));
  return list.sort((a, b) => b.factor - a.factor);
}

/**
 * Units offered in the POS for a sale mode.
 * - retail: all sellable units (packs + loose base) at retail prices.
 * - wholesale: ONLY packs that have a wholesale price, charged at that price
 *   (never retail). Base/loose and packs without a wholesale price are excluded.
 */
export function posUnits(m: UnitSource, saleType: "retail" | "wholesale"): MedicineUnit[] {
  if (saleType === "wholesale") {
    return (m.packUnits ?? [])
      .filter((u) => u && u.factor > 1 && (u.wholesalePrice ?? 0) > 0)
      .map((u) => ({ ...u, price: u.wholesalePrice as number }))
      .sort((a, b) => b.factor - a.factor);
  }
  return sellableUnits(m);
}

/** Is this a multi-unit product (has at least one pack configured)? */
export function isMultiUnit(m: UnitSource): boolean {
  return (m.packUnits ?? []).some((u) => u && u.factor > 1);
}

/** Readable packaging breakdown of a base-unit quantity, e.g. 503 → "5 Box + 3 Tablet". */
export function describeStock(baseQty: number, m: Pick<Medicine, "unit" | "packUnits">): string {
  const base = m.unit || "unit";
  const packs = (m.packUnits ?? []).filter((u) => u && u.factor > 1).sort((a, b) => b.factor - a.factor);
  if (packs.length === 0 || baseQty <= 0) return `${baseQty} ${base}`;
  let rem = baseQty;
  const parts: string[] = [];
  for (const p of packs) {
    const n = Math.floor(rem / p.factor);
    if (n > 0) {
      parts.push(`${n} ${p.name}`);
      rem -= n * p.factor;
    }
  }
  if (rem > 0 || parts.length === 0) parts.push(`${rem} ${base}`);
  return parts.join(" + ");
}

/** Units you can buy in — every pack plus the base unit (loose buying always allowed). */
export function purchasableUnits(m: Pick<Medicine, "unit" | "purchasePrice" | "packUnits">): MedicineUnit[] {
  const packs = (m.packUnits ?? []).filter((u) => u && u.factor > 1).sort((a, b) => b.factor - a.factor);
  return [...packs, { name: m.unit || "Unit", factor: 1, price: m.purchasePrice }];
}

/**
 * Human-readable packaging breakdown of a base-unit quantity, largest pack first.
 * e.g. 487 tablets with Box(100)+Strip(10) → "4 Box + 8 Strip + 7 Tablet".
 */
export function formatPackaging(baseQty: number, m: Pick<Medicine, "unit" | "packUnits">): string {
  const units = [
    ...(m.packUnits ?? []).filter((u) => u && u.factor > 1).sort((a, b) => b.factor - a.factor),
    { name: m.unit || "Unit", factor: 1, price: 0 },
  ];
  let remaining = Math.max(0, Math.floor(baseQty));
  const parts: string[] = [];
  for (const u of units) {
    if (u.factor <= 0) continue;
    const n = Math.floor(remaining / u.factor);
    if (n > 0) {
      parts.push(`${n} ${u.name}`);
      remaining -= n * u.factor;
    }
  }
  return parts.length ? parts.join(" + ") : `0 ${m.unit || "Unit"}`;
}

/**
 * Which pack names pack[i] may be built "of" — every OTHER named pack that does
 * NOT (transitively) depend on pack[i]. Excluding dependents prevents circular
 * packaging (e.g. you can't pick "Strip of Box" while "Box of Strip" exists).
 */
export function allowedOfNames(packs: MedicineUnit[], i: number): string[] {
  const self = (packs[i]?.name ?? "").trim().toLowerCase();
  const dependsOn = (name: string, target: string, seen: Set<string>): boolean => {
    const p = packs.find((x) => (x.name ?? "").trim().toLowerCase() === name);
    const of = (p?.of ?? "").trim().toLowerCase();
    if (!of) return false; // built from the base unit
    if (of === target) return true;
    if (seen.has(of)) return false;
    seen.add(of);
    return dependsOn(of, target, seen);
  };
  return packs
    .filter((p, idx) => {
      if (idx === i) return false; // not itself
      const name = (p.name ?? "").trim();
      if (!name) return false;
      return !(self && dependsOn(name.toLowerCase(), self, new Set()));
    })
    .map((p) => p.name.trim());
}

/**
 * Resolve each pack's base-unit `factor` from its nested definition
 * ("1 {name} = {contains} {of}"), where `of` is the base unit or another pack.
 * Legacy packs (no contains/of) are treated as `contains = factor`, `of = base`.
 * Unknown references or loops resolve to factor 0 (flagged by validatePackUnits).
 */
export function resolvePackUnits(packs: MedicineUnit[], baseName: string): MedicineUnit[] {
  const base = (baseName || "unit").trim().toLowerCase();
  const byName = new Map<string, MedicineUnit>();
  packs.forEach((p) => {
    const k = (p.name ?? "").trim().toLowerCase();
    if (k) byName.set(k, p);
  });
  const factorOf = (p: MedicineUnit, stack: Set<string>): number => {
    const contains = Math.floor(Number(p.contains ?? p.factor ?? 0));
    if (!Number.isFinite(contains) || contains < 1) return 0;
    const of = (p.of ?? baseName ?? "").trim().toLowerCase();
    if (of === base || of === "") return contains;
    const key = (p.name ?? "").trim().toLowerCase();
    if (!key || stack.has(key)) return 0; // self / cyclic reference
    const target = byName.get(of);
    if (!target) return 0; // references a unit that no longer exists
    stack.add(key);
    const sub = factorOf(target, stack);
    stack.delete(key);
    return sub > 0 ? contains * sub : 0;
  };
  return packs.map((p) => ({ ...p, factor: factorOf(p, new Set()) }));
}

/**
 * Validate pack-unit rows (already resolved via resolvePackUnits). Returns an
 * error message, or null if valid. The base unit (factor 1) is implicit and
 * must NOT appear here.
 */
export function validatePackUnits(packs: MedicineUnit[], baseUnitName: string): string | null {
  const seen = new Set<string>([baseUnitName.trim().toLowerCase()]);
  for (const u of packs) {
    const name = (u.name ?? "").trim();
    if (!name) return "Every packaging row needs a unit name.";
    const contains = Math.floor(Number(u.contains ?? u.factor ?? 0));
    if (!Number.isInteger(contains) || contains < 2) {
      return `"${name}" must contain at least 2 of its sub-unit.`;
    }
    if (!Number.isInteger(u.factor) || u.factor < 2) {
      return `Couldn't work out how many ${baseUnitName || "base unit"} are in "${name}" — check its "of" unit (it may be missing or form a loop).`;
    }
    if (!(u.price > 0)) return `"${name}" needs a selling price greater than 0.`;
    const key = name.toLowerCase();
    if (seen.has(key)) return `Duplicate unit name "${name}".`;
    seen.add(key);
  }
  return null;
}
