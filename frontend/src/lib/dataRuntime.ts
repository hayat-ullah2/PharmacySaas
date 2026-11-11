import type {
  Batch,
  Brand,
  Category,
  Customer,
  Manufacturer,
  Medicine,
  Purchase,
  Sale,
  Supplier,
} from "./types";

export type LiveRecords = Record<string, unknown[]>;

let liveRecords: LiveRecords | null = null;
const DAY_MS = 86_400_000;

export function setLiveRecords(records: LiveRecords | null) {
  liveRecords = records;
}

export function getLiveRecords<T>(entity: string, fallback: T[]): T[] {
  if (!liveRecords) return fallback;
  const values = liveRecords[entity] ?? [];

  if (entity === "medicines") {
    const today = new Date();
    return (values as Medicine[]).map((medicine) => {
      const expiry = new Date(`${medicine.expiry}T00:00:00`);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / DAY_MS);
      const status = daysUntilExpiry < 0
        ? "expired"
        : medicine.stock === 0
          ? "out"
          : daysUntilExpiry <= 90
            ? "expiring"
            : medicine.stock <= medicine.reorderLevel
              ? "low"
              : "healthy";
      return { ...medicine, status };
    }) as T[];
  }

  if (entity === "batches") {
    const today = new Date();
    return (values as Batch[]).map((batch) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(`${batch.expiryDate}T00:00:00`).getTime() - today.getTime()) / DAY_MS,
      );
      const status = daysUntilExpiry < 0
        ? "expired"
        : daysUntilExpiry <= 90
          ? "expiring"
          : "healthy";
      return { ...batch, status };
    }) as T[];
  }

  if (entity === "categories") {
    const medicines = (liveRecords.medicines ?? []) as Medicine[];
    return (values as Category[]).map((category) => ({
      ...category,
      medicineCount: medicines.filter((medicine) => medicine.category === category.name).length,
    })) as T[];
  }

  if (entity === "brands") {
    const medicines = (liveRecords.medicines ?? []) as Medicine[];
    return (values as Brand[]).map((brand) => ({
      ...brand,
      medicineCount: medicines.filter((medicine) => medicine.brand === brand.name).length,
    })) as T[];
  }

  if (entity === "manufacturers") {
    const medicines = (liveRecords.medicines ?? []) as Medicine[];
    return (values as Manufacturer[]).map((manufacturer) => ({
      ...manufacturer,
      productCount: medicines.filter((medicine) => medicine.manufacturer === manufacturer.name).length,
    })) as T[];
  }

  if (entity === "customers") {
    const sales = (liveRecords.sales ?? []) as Sale[];
    return (values as Customer[]).map((customer) => {
      const customerSales = sales.filter((sale) => sale.customer === customer.name);
      return {
        ...customer,
        totalPurchases: customerSales.reduce((total, sale) => total + sale.total, 0),
        lastPurchase: customerSales.map((sale) => sale.date).sort().at(-1) ?? customer.lastPurchase,
      };
    }) as T[];
  }

  if (entity === "suppliers") {
    const purchases = (liveRecords.purchases ?? []) as Purchase[];
    return (values as Supplier[]).map((supplier) => {
      const supplierPurchases = purchases.filter((purchase) => purchase.supplier === supplier.name);
      return {
        ...supplier,
        totalPurchases: supplierPurchases.reduce((total, purchase) => total + purchase.total, 0),
      };
    }) as T[];
  }

  return values as T[];
}

export function isLiveDataAvailable() {
  return liveRecords !== null;
}

export function liveArray<T>(entity: string, fallback: T[]): T[] {
  return new Proxy([] as T[], {
    get(_target, property) {
      const source = getLiveRecords(entity, fallback);
      const value = Reflect.get(source, property, source);
      return typeof value === "function" ? value.bind(source) : value;
    },
  });
}
