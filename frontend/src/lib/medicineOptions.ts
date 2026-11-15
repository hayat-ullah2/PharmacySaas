// Shared medicine option lists — single source of truth for the create form
// and the edit modal.

/**
 * Dosage form = the pharmaceutical form of the product (how the active
 * ingredient is formulated/presented). This is a clinical property.
 */
export const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Solution",
  "Injection",
  "Drops",
  "Inhaler",
  "Spray",
  "Cream",
  "Ointment",
  "Gel",
  "Lotion",
  "Suppository",
  "Powder",
  "Sachet",
  "Patch",
];

/**
 * Unit = how the product is packaged / counted when sold (the sale/pack unit).
 * These are COUNTABLE packaging units only — strength units like mg/ml live in
 * STRENGTH_UNITS and must not appear here.
 */
export const MEDICINE_UNITS = [
  "Tablet",
  "Capsule",
  "Strip",
  "Bottle",
  "Vial",
  "Ampoule",
  "Tube",
  "Sachet",
  "Box",
  "Pack",
  "Inhaler",
  "Piece",
];

/**
 * Strength unit = the unit of the active-ingredient amount (clinical dose),
 * kept separate from the packaging Unit. e.g. Paracetamol "500 mg".
 */
export const STRENGTH_UNITS = [
  "mg",
  "ml",
  "g",
  "mcg",
  "IU",
  "%",
  "mg/ml",
  "mg/5ml",
  "mcg/ml",
  "units",
  "puff",
];

/** Split a stored strength ("500mg") into its numeric value + unit for editing. */
export function splitStrength(
  strength?: string,
  strengthUnit?: string,
): { value: string; unit: string } {
  const s = (strength ?? "").trim();
  if (strengthUnit) {
    const u = strengthUnit.trim();
    const value = s.toLowerCase().endsWith(u.toLowerCase()) ? s.slice(0, s.length - u.length).trim() : s;
    return { value, unit: u };
  }
  // No stored unit: parse a leading number from a trailing unit (e.g. "500mg").
  const m = s.match(/^([\d.,/]+)\s*(.*)$/);
  if (m) return { value: m[1].trim(), unit: m[2].trim() };
  return { value: s, unit: "" };
}

/** Combine a numeric strength value + unit back into the stored string. */
export function combineStrength(value?: string, unit?: string): string {
  const v = (value ?? "").trim();
  const u = (unit ?? "").trim();
  return v ? `${v}${u}` : u;
}
