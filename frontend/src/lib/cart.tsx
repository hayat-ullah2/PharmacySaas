"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem, Medicine, MedicineUnit } from "./types";
import { useAuth } from "./auth";

interface CartTotals {
  count: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

interface CartContextValue {
  items: CartItem[];
  totals: CartTotals;
  addItem: (medicine: Medicine, unit: MedicineUnit, qty?: number) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
}

// No automatic discount or tax — a sale totals exactly its line items unless a
// cashier explicitly applies one. (The server re-validates these on checkout.)
const TAX_RATE = 0.0;
const DISCOUNT_RATE = 0.0;

const keyOf = (medicineId: string, unit: string) => `${medicineId}__${unit}`;

/** Base units already in the cart for a medicine, optionally excluding one line. */
function baseUsedForMedicine(items: CartItem[], medicineId: string, exceptKey?: string): number {
  return items
    .filter((i) => i.medicineId === medicineId && i.key !== exceptKey)
    .reduce((sum, i) => sum + i.quantity * i.factor, 0);
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `medicare.cart.${user.pharmacyId}` : "medicare.cart.signed-out";
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
      else setItems([]);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const write = useCallback((next: CartItem[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Cart persistence is optional; the in-memory cart remains usable.
    }
    return next;
  }, [storageKey]);

  const addItem = useCallback(
    (medicine: Medicine, unit: MedicineUnit, qty = 1) => {
      setItems((prev) => {
        const key = keyOf(medicine.id, unit.name);
        const usedByOthers = baseUsedForMedicine(prev, medicine.id, key);
        const maxUnits = Math.floor((medicine.stock - usedByOthers) / unit.factor);
        const existing = prev.find((i) => i.key === key);
        const target = Math.min((existing?.quantity ?? 0) + qty, Math.max(0, maxUnits));
        if (target <= 0) return prev; // nothing left in stock for this unit
        const line: CartItem = {
          key,
          medicineId: medicine.id,
          name: medicine.name,
          genericName: medicine.genericName,
          strength: medicine.strength,
          unit: unit.name,
          factor: unit.factor,
          price: unit.price,
          quantity: target,
          stock: medicine.stock,
          prescriptionRequired: medicine.prescriptionRequired,
        };
        const next = existing
          ? prev.map((i) => (i.key === key ? line : i))
          : [...prev, line];
        return write(next);
      });
    },
    [write],
  );

  const removeItem = useCallback(
    (key: string) => setItems((prev) => write(prev.filter((i) => i.key !== key))),
    [write],
  );

  const updateQty = useCallback(
    (key: string, qty: number) => {
      setItems((prev) => {
        const line = prev.find((i) => i.key === key);
        if (!line) return prev;
        const usedByOthers = baseUsedForMedicine(prev, line.medicineId, key);
        const maxUnits = Math.max(1, Math.floor((line.stock - usedByOthers) / line.factor));
        const target = Math.max(1, Math.min(qty, maxUnits));
        return write(prev.map((i) => (i.key === key ? { ...i, quantity: target } : i)));
      });
    },
    [write],
  );

  const clear = useCallback(() => setItems((prev) => write(prev.length ? [] : prev)), [write]);

  const totals = useMemo<CartTotals>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = Math.round(subtotal * DISCOUNT_RATE);
    const tax = Math.round((subtotal - discount) * TAX_RATE);
    const total = subtotal - discount + tax;
    const count = items.reduce((s, i) => s + i.quantity, 0);
    return { count, subtotal, discount, tax, total };
  }, [items]);

  const value = useMemo(
    () => ({ items, totals, addItem, removeItem, updateQty, clear }),
    [items, totals, addItem, removeItem, updateQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
