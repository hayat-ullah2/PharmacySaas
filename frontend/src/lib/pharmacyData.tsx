"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CartItem, Medicine } from "./types";
import { useAuth } from "./auth";
import { setLiveRecords } from "./dataRuntime";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

interface PharmacyDataContextValue {
  ready: boolean;
  revision: number;
  error: string | null;
  lastSale: { id: string; invoice: string } | null;
  clearLastSale: () => void;
  reload: () => Promise<void>;
  saveRecord: <T extends { id: string }>(entity: string, record: T) => Promise<void>;
  createMedicine: (medicine: Medicine) => Promise<void>;
  addBatch: (batch: Record<string, unknown>) => Promise<void>;
  adjustStock: (medicineId: string, newStock: number, reason: string) => Promise<void>;
  receivePurchase: (purchaseId: string) => Promise<void>;
  recordSaleReturn: (saleId: string, items: { medicineId: string; quantity: number }[], reason: string) => Promise<void>;
  recordPurchaseReturn: (purchaseId: string, reason: string) => Promise<void>;
  deleteRecord: (entity: string, id: string) => Promise<void>;
  inviteManager: (name: string, email: string) => Promise<void>;
  setManagerStatus: (id: string, status: "active" | "inactive") => Promise<void>;
  savePharmacy: (updates: Record<string, string>) => Promise<void>;
  completeSale: (
    items: CartItem[],
    customerId: string | null,
    payment: string,
    prescriptionId: string | null,
    totals: { subtotal: number; discount: number; tax: number; total: number },
    amountPaid: number,
  ) => Promise<{ id: string; invoice: string }>;
}

const PharmacyDataContext = createContext<PharmacyDataContextValue | null>(null);

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "The pharmacy data request failed.";
}

export function PharmacyDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<{ pharmacyId: string; id: string; invoice: string } | null>(null);
  const [loadedPharmacyId, setLoadedPharmacyId] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!user || user.role === "super_admin" || !isSupabaseConfigured()) {
      setLiveRecords(null);
      setReady(true);
      return;
    }

    const request = ++requestId.current;
    setReady(false);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const rows: { entity: string; record_id: string; data: unknown }[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data, error: recordsError } = await supabase
          .from("pharmacy_records")
          .select("entity, record_id, data")
          .order("entity")
          .order("record_id")
          .range(from, from + pageSize - 1);
        if (recordsError) throw recordsError;

        const page = data ?? [];
        rows.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, role, status, last_login")
        .eq("pharmacy_id", user.pharmacyId);
      if (profilesError) throw profilesError;
      if (request !== requestId.current) return;

      const records: Record<string, unknown[]> = {};
      for (const row of rows) {
        (records[row.entity] ??= []).push(row.data);
      }
      records.users = (profiles ?? []).map((profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        lastLogin: profile.last_login ?? "Never",
        avatarColor: "#6366f1",
      }));

      setLiveRecords(records);
      setLoadedPharmacyId(user.pharmacyId);
      setRevision((value) => value + 1);
    } catch (loadError) {
      if (request === requestId.current) {
        setError(messageOf(loadError));
      }
      throw loadError;
    } finally {
      if (request === requestId.current) setReady(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role === "super_admin") {
      requestId.current += 1;
      setLiveRecords(null);
      return;
    }

    setLiveRecords({});
    const timer = window.setTimeout(() => {
      void reload().catch(() => undefined);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [user, reload]);

  const saveRecord = useCallback(
    async <T extends { id: string },>(entity: string, record: T) => {
      if (!user) throw new Error("Sign in to save pharmacy data.");
      const { error: saveError } = await getSupabaseClient()
        .from("pharmacy_records")
        .upsert(
          {
            pharmacy_id: user.pharmacyId,
            entity,
            record_id: record.id,
            data: record,
          },
          { onConflict: "pharmacy_id,entity,record_id" },
        );
      if (saveError) throw saveError;
      await reload();
    },
    [user, reload],
  );

  const deleteRecord = useCallback(
    async (entity: string, id: string) => {
      if (!user) throw new Error("Sign in to update pharmacy data.");
      const { error: deleteError } = await getSupabaseClient()
        .from("pharmacy_records")
        .delete()
        .eq("pharmacy_id", user.pharmacyId)
        .eq("entity", entity)
        .eq("record_id", id);
      if (deleteError) throw deleteError;
      await reload();
    },
    [user, reload],
  );

  const createMedicine = useCallback(async (medicine: Medicine) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can add medicines.");
    }
    const { error: createError } = await getSupabaseClient().rpc("create_medicine", {
      p_medicine: medicine,
    });
    if (createError) throw createError;
    await reload();
  }, [user, reload]);

  const addBatch = useCallback(async (batch: Record<string, unknown>) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can add stock.");
    }
    const { error: batchError } = await getSupabaseClient().rpc("add_batch", { p_batch: batch });
    if (batchError) throw batchError;
    await reload();
  }, [user, reload]);

  const adjustStock = useCallback(async (medicineId: string, newStock: number, reason: string) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can adjust stock.");
    }
    const { error: adjustError } = await getSupabaseClient().rpc("adjust_stock", {
      p_medicine_id: medicineId,
      p_new_stock: newStock,
      p_reason: reason,
    });
    if (adjustError) throw adjustError;
    await reload();
  }, [user, reload]);

  const receivePurchase = useCallback(async (purchaseId: string) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can receive purchase orders.");
    }
    const { error: receiveError } = await getSupabaseClient().rpc("receive_purchase", {
      p_purchase_id: purchaseId,
    });
    if (receiveError) throw receiveError;
    await reload();
  }, [user, reload]);

  const recordSaleReturn = useCallback(async (saleId: string, items: { medicineId: string; quantity: number }[], reason: string) => {
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      throw new Error("You are not allowed to process returns.");
    }
    const { error: returnError } = await getSupabaseClient().rpc("record_sale_return", {
      p_sale_id: saleId,
      p_items: items,
      p_reason: reason,
    });
    if (returnError) throw returnError;
    await reload();
  }, [user, reload]);

  const recordPurchaseReturn = useCallback(async (purchaseId: string, reason: string) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can return stock to suppliers.");
    }
    const { error: returnError } = await getSupabaseClient().rpc("record_purchase_return", {
      p_purchase_id: purchaseId,
      p_reason: reason,
    });
    if (returnError) throw returnError;
    await reload();
  }, [user, reload]);

  const inviteManager = useCallback(async (name: string, email: string) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can invite a manager.");
    }
    const { error: inviteError } = await getSupabaseClient().functions.invoke(
      "invite-manager",
      { body: { name: name.trim(), email: email.trim().toLowerCase() } },
    );
    if (inviteError) throw inviteError;
    await reload();
  }, [user, reload]);

  const setManagerStatus = useCallback(async (id: string, status: "active" | "inactive") => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can change a manager account.");
    }
    const { error: updateError } = await getSupabaseClient().functions.invoke(
      "invite-manager",
      { body: { action: "set-status", id, status } },
    );
    if (updateError) throw updateError;
    await reload();
  }, [user, reload]);

  const savePharmacy = useCallback(
    async (updates: Record<string, string>) => {
      if (!user || user.role !== "admin") {
        throw new Error("Only the pharmacy owner can change pharmacy settings.");
      }
      const { error: updateError } = await getSupabaseClient()
        .from("pharmacies")
        .update(updates)
        .eq("id", user.pharmacyId);
      if (updateError) throw updateError;
    },
    [user],
  );

  const completeSale = useCallback(
    async (
      items: CartItem[],
      customerId: string | null,
      payment: string,
      prescriptionId: string | null,
      totals: { subtotal: number; discount: number; tax: number; total: number },
      amountPaid: number,
    ) => {
      if (!user || user.role !== "manager") {
        throw new Error("A manager account is required to complete a sale.");
      }
      const { data, error: saleError } = await getSupabaseClient().rpc("complete_sale", {
        p_customer_id: customerId,
        p_items: items.map((item) => ({
          medicine_id: item.medicineId,
          unit: item.unit,
          quantity: item.quantity,
        })),
        p_payment: payment,
        p_discount: totals.discount,
        p_tax: totals.tax,
        p_subtotal: totals.subtotal,
        p_total: totals.total,
        p_amount_paid: amountPaid,
        p_prescription_id: prescriptionId,
      });
      if (saleError) throw saleError;

      if (!data || typeof data !== "object" || !("id" in data) || !("invoice" in data)) {
        throw new Error("The sale was saved, but the server returned an invalid invoice.");
      }
      const completed = { pharmacyId: user.pharmacyId, id: String(data.id), invoice: String(data.invoice) };
      setLastSale(completed);
      try {
        await reload();
      } catch (refreshError) {
        throw new Error(
          `Sale ${completed.invoice} was completed, but refreshing pharmacy data failed. Do not submit it again. ${messageOf(refreshError)}`,
        );
      }
      return { id: completed.id, invoice: completed.invoice };
    },
    [user, reload],
  );

  const clearLastSale = useCallback(() => setLastSale(null), []);

  const value = useMemo(
    () => ({
      ready: !user || (ready && loadedPharmacyId === user.pharmacyId),
      revision,
      error,
      lastSale: lastSale && user && lastSale.pharmacyId === user.pharmacyId
        ? { id: lastSale.id, invoice: lastSale.invoice }
        : null,
      clearLastSale,
      reload,
      saveRecord,
      createMedicine,
      addBatch,
      adjustStock,
      receivePurchase,
      recordSaleReturn,
      recordPurchaseReturn,
      deleteRecord,
      inviteManager,
      setManagerStatus,
      savePharmacy,
      completeSale,
    }),
    [user, ready, loadedPharmacyId, revision, error, lastSale, clearLastSale, reload, saveRecord, createMedicine, addBatch, adjustStock, receivePurchase, recordSaleReturn, recordPurchaseReturn, deleteRecord, inviteManager, setManagerStatus, savePharmacy, completeSale],
  );

  return (
    <PharmacyDataContext.Provider value={value}>
      {children}
    </PharmacyDataContext.Provider>
  );
}

export function usePharmacyData() {
  const context = useContext(PharmacyDataContext);
  if (!context) throw new Error("usePharmacyData must be used within PharmacyDataProvider");
  return context;
}
