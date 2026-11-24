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
import { setLiveRecords, patchLiveRecords, type LiveRecords } from "./dataRuntime";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

// Append-only / single-page entities: not loaded on login, fetched on demand by
// the page that needs them (useLazyEntity). Keeps the initial payload small and
// stops history (audit logs, payments…) from growing every page load.
const LAZY_ENTITIES = new Set([
  "audit_logs",
  "payments",
  "adjustments",
  "sales_returns",
  "purchase_returns",
  "cash_ledger",
]);

interface PharmacyDataContextValue {
  ready: boolean;
  revision: number;
  error: string | null;
  lastSale: { id: string; invoice: string } | null;
  clearLastSale: () => void;
  reload: (entities?: string[]) => Promise<void>;
  loadEntity: (entity: string) => Promise<void>;
  saveRecord: <T extends { id: string }>(entity: string, record: T) => Promise<void>;
  createMedicine: (medicine: Medicine & { openingBatchNumber?: string }) => Promise<void>;
  addBatch: (batch: Record<string, unknown>) => Promise<void>;
  adjustStock: (medicineId: string, newStock: number, reason: string) => Promise<void>;
  receivePurchase: (purchaseId: string) => Promise<void>;
  recordSaleReturn: (saleId: string, items: { medicineId: string; unit?: string; quantity: number }[], reason: string) => Promise<void>;
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
    amountReceived: number,
    saleType?: "retail" | "wholesale",
  ) => Promise<{ id: string; invoice: string }>;
  recordCashDeposit: (amount: number, note: string) => Promise<void>;
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

  const loadedLazy = useRef<Set<string>>(new Set());

  // Fetch pharmacy_records rows (paginated) matching an entity filter.
  const fetchEntityRows = useCallback(async (
    filter: { kind: "exclude"; list: string[] } | { kind: "in"; list: string[] } | { kind: "eq"; name: string },
  ) => {
    const supabase = getSupabaseClient();
    const pageSize = 1000;
    const rows: { entity: string; record_id: string; data: unknown }[] = [];
    let from = 0;
    while (true) {
      let query = supabase.from("pharmacy_records").select("entity, record_id, data").order("entity").order("record_id").range(from, from + pageSize - 1);
      if (filter.kind === "exclude") query = query.not("entity", "in", `(${filter.list.join(",")})`);
      else if (filter.kind === "in") query = query.in("entity", filter.list);
      else query = query.eq("entity", filter.name);
      const { data, error } = await query;
      if (error) throw error;
      const page = (data ?? []) as { entity: string; record_id: string; data: unknown }[];
      rows.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!user) return [];
    const { data: profiles, error } = await getSupabaseClient()
      .from("profiles")
      .select("id, name, email, role, status, last_login")
      .eq("pharmacy_id", user.pharmacyId);
    if (error) throw error;
    return (profiles ?? []).map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      lastLogin: profile.last_login ?? "Never",
      avatarColor: "#6366f1",
    }));
  }, [user]);

  const reload = useCallback(async (entities?: string[]) => {
    if (!user || user.role === "super_admin" || !isSupabaseConfigured()) {
      setLiveRecords(null);
      setReady(true);
      return;
    }

    // Targeted refetch after a mutation — only the touched entities, merged in.
    if (entities && entities.length > 0) {
      const recordEntities = entities.filter((e) => e !== "users" && (!LAZY_ENTITIES.has(e) || loadedLazy.current.has(e)));
      try {
        const partial: LiveRecords = {};
        if (recordEntities.length > 0) {
          const rows = await fetchEntityRows({ kind: "in", list: recordEntities });
          for (const e of recordEntities) partial[e] = [];
          for (const row of rows) (partial[row.entity] ??= []).push(row.data);
        }
        if (entities.includes("users")) partial.users = await fetchUsers();
        patchLiveRecords(partial);
        setRevision((value) => value + 1);
      } catch (patchError) {
        setError(messageOf(patchError));
        throw patchError;
      }
      return;
    }

    // Full load (login / pharmacy switch) — eager entities only; lazy loaded on demand.
    const request = ++requestId.current;
    setReady(false);
    setError(null);
    try {
      const [rows, users] = await Promise.all([
        fetchEntityRows({ kind: "exclude", list: [...LAZY_ENTITIES] }),
        fetchUsers(),
      ]);
      if (request !== requestId.current) return;

      const records: Record<string, unknown[]> = {};
      for (const row of rows) {
        (records[row.entity] ??= []).push(row.data);
      }
      loadedLazy.current = new Set();
      records.users = users;

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
  }, [user, fetchEntityRows, fetchUsers]);

  // Lazy-load a single append-only entity on demand (called via useLazyEntity).
  const loadEntity = useCallback(async (entity: string) => {
    if (!user || user.role === "super_admin" || !isSupabaseConfigured()) return;
    if (!LAZY_ENTITIES.has(entity) || loadedLazy.current.has(entity)) return;
    try {
      const rows = await fetchEntityRows({ kind: "eq", name: entity });
      loadedLazy.current.add(entity);
      patchLiveRecords({ [entity]: rows.map((row) => row.data) });
      setRevision((value) => value + 1);
    } catch (loadError) {
      setError(messageOf(loadError));
    }
  }, [user, fetchEntityRows]);

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
      await reload([entity]);
    },
    [user, reload],
  );

  const deleteRecord = useCallback(
    async (entity: string, id: string) => {
      if (!user) throw new Error("Sign in to update pharmacy data.");
      // Deleting a medicine must also remove its batches + stock adjustments,
      // otherwise they linger as orphans in Batch Management / Inventory.
      if (entity === "medicines") {
        const { error: rpcError } = await getSupabaseClient().rpc("delete_medicine", { p_medicine_id: id });
        if (rpcError) throw rpcError;
        await reload(["medicines", "batches", "adjustments"]);
        return;
      }
      const { error: deleteError } = await getSupabaseClient()
        .from("pharmacy_records")
        .delete()
        .eq("pharmacy_id", user.pharmacyId)
        .eq("entity", entity)
        .eq("record_id", id);
      if (deleteError) throw deleteError;
      await reload([entity]);
    },
    [user, reload],
  );

  const createMedicine = useCallback(async (medicine: Medicine & { openingBatchNumber?: string }) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can add medicines.");
    }
    const { error: createError } = await getSupabaseClient().rpc("create_medicine", {
      p_medicine: medicine,
    });
    if (createError) throw createError;
    await reload(["medicines", "batches"]);
  }, [user, reload]);

  const addBatch = useCallback(async (batch: Record<string, unknown>) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can add stock.");
    }
    const { error: batchError } = await getSupabaseClient().rpc("add_batch", { p_batch: batch });
    if (batchError) throw batchError;
    await reload(["medicines", "batches"]);
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
    await reload(["medicines", "batches", "adjustments"]);
  }, [user, reload]);

  const receivePurchase = useCallback(async (purchaseId: string) => {
    if (!user || user.role !== "admin") {
      throw new Error("Only the pharmacy owner can receive purchase orders.");
    }
    const { error: receiveError } = await getSupabaseClient().rpc("receive_purchase", {
      p_purchase_id: purchaseId,
    });
    if (receiveError) throw receiveError;
    await reload(["purchases", "medicines", "batches"]);
  }, [user, reload]);

  const recordSaleReturn = useCallback(async (saleId: string, items: { medicineId: string; unit?: string; quantity: number }[], reason: string) => {
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      throw new Error("You are not allowed to process returns.");
    }
    const { error: returnError } = await getSupabaseClient().rpc("record_sale_return", {
      p_sale_id: saleId,
      p_items: items,
      p_reason: reason,
    });
    if (returnError) throw returnError;
    await reload(["sales", "medicines", "batches", "sales_returns"]);
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
    await reload(["purchases", "medicines", "batches", "purchase_returns"]);
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
    await reload(["users"]);
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
    await reload(["users"]);
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
      amountReceived: number,
      saleType: "retail" | "wholesale" = "retail",
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
        // Amount TENDERED — the server derives the clamped paid + the change.
        p_amount_paid: amountReceived,
        p_prescription_id: prescriptionId,
        p_sale_type: saleType,
      });
      if (saleError) throw saleError;

      if (!data || typeof data !== "object" || !("id" in data) || !("invoice" in data)) {
        throw new Error("The sale was saved, but the server returned an invalid invoice.");
      }
      const completed = { pharmacyId: user.pharmacyId, id: String(data.id), invoice: String(data.invoice) };
      setLastSale(completed);
      try {
        await reload(["medicines", "batches", "sales", "payments", "customers", "prescriptions"]);
      } catch (refreshError) {
        throw new Error(
          `Sale ${completed.invoice} was completed, but refreshing pharmacy data failed. Do not submit it again. ${messageOf(refreshError)}`,
        );
      }
      return { id: completed.id, invoice: completed.invoice };
    },
    [user, reload],
  );

  const recordCashDeposit = useCallback(async (amount: number, note: string) => {
    if (!user || user.role !== "manager") {
      throw new Error("Only a cashier can record a cash deposit.");
    }
    const { error: depositError } = await getSupabaseClient().rpc("record_cash_deposit", {
      p_amount: amount,
      p_note: note || null,
    });
    if (depositError) throw depositError;
    await reload(["cash_ledger"]);
  }, [user, reload]);

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
      loadEntity,
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
      recordCashDeposit,
    }),
    [user, ready, loadedPharmacyId, revision, error, lastSale, clearLastSale, reload, loadEntity, saveRecord, createMedicine, addBatch, adjustStock, receivePurchase, recordSaleReturn, recordPurchaseReturn, deleteRecord, inviteManager, setManagerStatus, savePharmacy, completeSale, recordCashDeposit],
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

/**
 * Lazily fetch an append-only entity (audit_logs, payments, adjustments,
 * sales_returns, purchase_returns, cash_ledger) that is NOT loaded at login.
 * Call once at the top of any page that reads one of those lists.
 */
export function useLazyEntity(entity: string) {
  const { loadEntity, ready } = usePharmacyData();
  useEffect(() => {
    if (ready) void loadEntity(entity);
  }, [entity, ready, loadEntity]);
}
