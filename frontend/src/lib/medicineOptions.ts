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
 * Unit = how the product is counted when sold/dispensed (the sale/pack unit).
 * Some values (Tablet, Capsule) are legitimately both a form and a sale unit.
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
  "ml",
  "gm",
];
