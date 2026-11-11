"use client";

import type { Medicine, Prescription } from "./types";

export interface DispenseResult {
  added: number;
  missing: string[];
}

/**
 * Match a prescription's medicines to the live catalog and add the in-stock ones to the cart.
 * Prescription names look like "Augmentin 625mg"; catalog items are name + strength.
 */
export function dispensePrescriptionToCart(
  rx: Prescription,
  medicines: Medicine[],
  addItem: (medicine: Medicine, qty?: number) => void,
): DispenseResult {
  let added = 0;
  const missing: string[] = [];
  for (const pm of rx.medicines) {
    const name = pm.name.toLowerCase();
    const med = medicines.find(
      (m) => name === `${m.name} ${m.strength}`.toLowerCase() || name.startsWith(m.name.toLowerCase()),
    );
    if (med && med.stock > 0) {
      addItem(med, Math.min(pm.qty, med.stock));
      added += 1;
    } else {
      missing.push(pm.name);
    }
  }
  return { added, missing };
}
