"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem, Medicine } from "./types";
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
  addItem: (medicine: Medicine, qty?: number) => void;
  removeItem: (medicineId: string) => void;
  updateQty: (medicineId: string, qty: number) => void;
  clear: () => void;
}

// No automatic discount or tax — a sale totals exactly its line items unless a
// cashier explicitly applies one. (The server re-validates these on checkout.)
const TAX_RATE = 0.0;
const DISCOUNT_RATE = 0.0;

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

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Cart persistence is optional; the in-memory cart remains usable.
    }
  }, [storageKey]);

  const addItem = useCallback(
    (medicine: Medicine, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.medicineId === medicine.id);
        let next: CartItem[];
        if (existing) {
          next = prev.map((i) =>
            i.medicineId === medicine.id
              ? { ...i, quantity: Math.min(i.quantity + qty, i.stock) }
              : i,
          );
        } else {
          next = [
            ...prev,
            {
              medicineId: medicine.id,
              name: medicine.name,
              genericName: medicine.genericName,
              strength: medicine.strength,
              price: medicine.sellingPrice,
              quantity: Math.min(qty, medicine.stock || qty),
              stock: medicine.stock,
              prescriptionRequired: medicine.prescriptionRequired,
            },
          ];
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Cart persistence is optional; the in-memory cart remains usable.
        }
        return next;
      });
    },
    [storageKey],
  );

  const removeItem = useCallback(
    (medicineId: string) => {
      persist(items.filter((i) => i.medicineId !== medicineId));
    },
    [items, persist],
  );

  const updateQty = useCallback(
    (medicineId: string, qty: number) => {
      persist(
        items.map((i) =>
          i.medicineId === medicineId
            ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock || qty)) }
            : i,
        ),
      );
    },
    [items, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

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
