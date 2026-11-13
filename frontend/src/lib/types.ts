// ---- Domain types for the MediCare pharmacy prototype ----

export type Role = "admin" | "manager" | "pharmacist" | "cashier" | "inventory";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  lastLogin: string;
  avatarColor: string;
}

export type StockStatus = "healthy" | "low" | "expiring" | "expired" | "out";

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  brand: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  reorderLevel: number;
  stock: number;
  prescriptionRequired: boolean;
  description: string;
  expiry: string; // nearest batch expiry
  status: StockStatus;
  sku: string;
  image?: string; // Cloudinary secure URL
  // --- Multi-unit packaging (optional; absent = single-unit product) ---
  productType?: string; // e.g. Tablet, Syrup, Injection — for guidance only
  packUnits?: MedicineUnit[]; // larger packs (factor > 1): Strip, Box, Carton…
  allowLoose?: boolean; // can the base unit be sold singly? (default true)
}

export interface Category {
  id: string;
  name: string;
  description: string;
  medicineCount: number;
  color: string;
}

export interface Brand {
  id: string;
  name: string;
  manufacturer: string;
  medicineCount: number;
}

export interface Manufacturer {
  id: string;
  name: string;
  country: string;
  contact: string;
  productCount: number;
}

export type BatchStatus = "healthy" | "expiring" | "expired";

export interface Batch {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  purchaseDate: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  remaining: number;
  status: BatchStatus;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  totalPurchases: number;
  paid: number;
  outstanding: number;
  status: "active" | "inactive";
}

export type PurchaseStatus =
  | "draft"
  | "ordered"
  | "received"
  | "partial"
  | "returned"
  | "cancelled";

export interface PurchaseItem {
  medicineId?: string;
  medicineName: string;
  batch: string;
  quantity: number;
  purchasePrice: number;
  expiryDate: string;
}

export interface Purchase {
  id: string;
  poNumber: string;
  supplier: string;
  items: PurchaseItem[];
  itemCount: number;
  total: number;
  status: PurchaseStatus;
  date: string;
  expectedDate: string;
}

export type PaymentMethod = "cash" | "card" | "bank" | "other";
export type SaleStatus = "paid" | "pending" | "refunded" | "partial";

/** A sellable packaging unit for a medicine (e.g. Strip = 10 base units @ Rs 50). */
export interface MedicineUnit {
  name: string;
  factor: number; // how many BASE units one of this unit contains (base unit = 1)
  price: number; // selling price for ONE of this unit (may be non-proportional)
}

export interface SaleItem {
  medicineId?: string;
  medicineName: string;
  quantity: number;
  price: number;
  subtotal: number;
  returnedQty?: number;
}

export interface Sale {
  id: string;
  invoice: string;
  customer: string;
  items: SaleItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid?: number;
  outstanding?: number;
  returnedAmount?: number;
  payment: PaymentMethod;
  status: SaleStatus;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalPurchases: number;
  outstanding: number;
  lastPurchase: string;
  status: "active" | "inactive";
  address: string;
}

export type PrescriptionStatus =
  | "pending"
  | "approved"
  | "dispensed"
  | "rejected";

export interface Prescription {
  id: string;
  code: string;
  patient: string;
  doctor: string;
  medicines: { name: string; dosage: string; qty: number }[];
  date: string;
  status: PrescriptionStatus;
  notes: string;
}

export interface StockAdjustment {
  id: string;
  medicineId: string;
  medicineName: string;
  previousStock: number;
  newStock: number;
  delta: number;
  reason: string;
  date: string;
}

export interface SalesReturn {
  id: string;
  invoice: string;
  customer: string;
  reason: string;
  amount: number;
  status: "approved" | "pending" | "rejected";
  date: string;
}

export interface PurchaseReturn {
  id: string;
  poNumber: string;
  supplier: string;
  reason: string;
  amount: number;
  status: "approved" | "pending" | "rejected";
  date: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  method: PaymentMethod;
}

export interface Payment {
  id: string;
  reference: string;
  party: string;
  type: "incoming" | "outgoing";
  amount: number;
  method: PaymentMethod;
  date: string;
  status: "completed" | "pending";
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  detail: string;
  timestamp: string;
  ip: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "danger" | "success";
  time: string;
  read: boolean;
}

export interface PharmacySettings {
  id: string;
  lowStock: boolean;
  expiryAlerts: boolean;
  dailySummary: boolean;
  salesAlerts: boolean;
}

// ---- Cart ----
export interface CartItem {
  key: string; // medicineId + unit — unique per line (multiple units per medicine)
  medicineId: string;
  name: string;
  genericName: string;
  strength: string;
  unit: string; // selected selling unit (Box / Strip / Tablet / Bottle…)
  factor: number; // base units per selected unit
  price: number; // price for ONE of the selected unit
  quantity: number; // number of the selected unit
  stock: number; // medicine base-unit stock (for validation)
  prescriptionRequired: boolean;
}
