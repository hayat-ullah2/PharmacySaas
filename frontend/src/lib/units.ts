import type { Medicine, MedicineUnit } from "./types";

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

/** Is this a multi-unit product (has at least one pack configured)? */
export function isMultiUnit(m: UnitSource): boolean {
  return (m.packUnits ?? []).some((u) => u && u.factor > 1);
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
 * Validate pack-unit rows. Returns an error message, or null if valid.
 * Base unit (factor 1) is implicit and must NOT appear here.
 */
export function validatePackUnits(packs: MedicineUnit[], baseUnitName: string): string | null {
  const seen = new Set<string>([baseUnitName.trim().toLowerCase()]);
  for (const u of packs) {
    const name = (u.name ?? "").trim();
    if (!name) return "Every packaging row needs a unit name.";
    if (!Number.isInteger(u.factor) || u.factor < 2) {
      return `"${name}" must contain a whole number of base units (2 or more).`;
    }
    if (!(u.price > 0)) return `"${name}" needs a selling price greater than 0.`;
    const key = name.toLowerCase();
    if (seen.has(key)) return `Duplicate unit name "${name}".`;
    seen.add(key);
  }
  return null;
}
