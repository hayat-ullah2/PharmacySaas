"use client";

import type { Medicine, MedicineUnit } from "./types";
import { combineStrength, splitStrength } from "./medicineOptions";
import { resolvePackUnits, validatePackUnits } from "./units";

// The import/export template columns, in order. `key` maps to a Medicine field.
export const MEDICINE_COLUMNS: { header: string; key: string; required?: boolean; width?: number }[] = [
  { header: "Name*", key: "name", required: true, width: 22 },
  { header: "Generic Name*", key: "genericName", required: true, width: 22 },
  { header: "Category", key: "category", width: 16 },
  { header: "Brand", key: "brand", width: 16 },
  { header: "Manufacturer", key: "manufacturer", width: 18 },
  { header: "Dosage Form", key: "dosageForm", width: 14 },
  { header: "Strength", key: "strengthValue", width: 10 },
  { header: "Strength Unit", key: "strengthUnit", width: 12 },
  { header: "Unit*", key: "unit", required: true, width: 10 },
  { header: "Selling Price*", key: "sellingPrice", required: true, width: 13 },
  { header: "Purchase Price*", key: "purchasePrice", required: true, width: 14 },
  { header: "MRP", key: "mrp", width: 10 },
  { header: "Supplier", key: "supplier", width: 18 },
  { header: "Reorder Level*", key: "reorderLevel", required: true, width: 13 },
  { header: "Opening Stock*", key: "stock", required: true, width: 13 },
  { header: "Expiry (YYYY-MM-DD)*", key: "expiry", required: true, width: 20 },
  { header: "Batch Number", key: "openingBatchNumber", width: 16 },
  { header: "SKU", key: "sku", width: 14 },
  { header: "Prescription Required (yes/no)", key: "prescriptionRequired", width: 26 },
  { header: "Description", key: "description", width: 28 },
  // --- Packaging & unit pricing (optional): builds Outer → Sub → base ---
  { header: "Sub-Package Name", key: "subName", width: 16 },
  { header: "Units per Sub-Package", key: "subUnits", width: 18 },
  { header: "Sub-Package Price", key: "subPrice", width: 16 },
  { header: "Outer Pack Name", key: "outerName", width: 16 },
  { header: "Sub-Packages per Outer", key: "outerUnits", width: 20 },
  { header: "Outer Pack Price", key: "outerPrice", width: 16 },
  { header: "Allow Retail (yes/no)", key: "allowRetail", width: 18 },
  { header: "Allow Wholesale (yes/no)", key: "allowWholesale", width: 20 },
];

export interface ParsedRow {
  /** 1-based row number in the sheet (for error messages). */
  row: number;
  raw: Record<string, unknown>;
}

export interface ValidatedRow {
  row: number;
  medicine?: Medicine; // present when the row is valid
  errors: string[];
}

function downloadBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Build the medicines workbook as a buffer (no DOM — safe to unit-test). */
export async function buildMedicinesWorkbook(medicines: Medicine[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Medicines");
  ws.columns = MEDICINE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true };
  for (const m of medicines) {
    const { value, unit } = splitStrength(m.strength, m.strengthUnit);
    const packs = [...(m.packUnits ?? [])].filter((u) => u.factor > 1).sort((a, b) => a.factor - b.factor);
    const sub = packs[0];
    const outer = packs[1];
    ws.addRow({
      name: m.name,
      genericName: m.genericName,
      category: m.category,
      brand: m.brand,
      manufacturer: m.manufacturer,
      dosageForm: m.dosageForm,
      strengthValue: value,
      strengthUnit: unit,
      unit: m.unit,
      sellingPrice: m.sellingPrice,
      purchasePrice: m.purchasePrice,
      mrp: m.mrp ?? "",
      supplier: m.supplier ?? "",
      reorderLevel: m.reorderLevel,
      stock: m.stock,
      expiry: m.expiry,
      openingBatchNumber: "",
      sku: m.sku,
      prescriptionRequired: m.prescriptionRequired ? "yes" : "no",
      description: m.description ?? "",
      subName: sub?.name ?? "",
      subUnits: sub ? (sub.contains ?? sub.factor) : "",
      subPrice: sub?.price ?? "",
      outerName: outer?.name ?? "",
      outerUnits: outer ? (outer.contains ?? Math.round(outer.factor / (sub?.factor || 1))) : "",
      outerPrice: outer?.price ?? "",
      allowRetail: m.allowLoose === false ? "no" : "yes",
      allowWholesale: m.allowWholesale === false ? "no" : "yes",
    });
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Export all given medicines to a .xlsx file. */
export async function exportMedicinesXlsx(medicines: Medicine[], filename = "medicines.xlsx"): Promise<number> {
  downloadBlob(await buildMedicinesWorkbook(medicines), filename);
  return medicines.length;
}

/** Download a blank template with headers, two example rows, and an instructions sheet. */
export async function downloadMedicineTemplate(): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Medicines");
  ws.columns = MEDICINE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true };
  ws.addRow({
    name: "Panadol", genericName: "Paracetamol", category: "Pain Relief", brand: "GSK", manufacturer: "GSK",
    dosageForm: "Tablet", strengthValue: "500", strengthUnit: "mg", unit: "Tablet", sellingPrice: 5, purchasePrice: 3,
    mrp: 7, supplier: "", reorderLevel: 50, stock: 1000, expiry: "2027-12-31", openingBatchNumber: "PAN-2026-01",
    sku: "PAN-500", prescriptionRequired: "no", description: "Analgesic / antipyretic",
    subName: "Strip", subUnits: 10, subPrice: 70, outerName: "Carton", outerUnits: 100, outerPrice: 7000,
    allowRetail: "yes", allowWholesale: "yes",
  });
  ws.addRow({
    name: "Augmentin", genericName: "Amoxicillin + Clavulanate", category: "Antibiotics", brand: "GSK", manufacturer: "GSK",
    dosageForm: "Syrup", strengthValue: "156", strengthUnit: "mg/5ml", unit: "Bottle", sellingPrice: 320, purchasePrice: 250,
    mrp: 360, supplier: "", reorderLevel: 10, stock: 40, expiry: "2027-06-30", openingBatchNumber: "",
    sku: "AUG-156", prescriptionRequired: "yes", description: "",
  });

  const notes = wb.addWorksheet("Instructions");
  notes.columns = [{ header: "Column", width: 28 }, { header: "Required", width: 10 }, { header: "Notes", width: 60 }];
  notes.getRow(1).font = { bold: true };
  const rules: [string, string, string][] = [
    ["Name", "Yes", "Medicine name (min 2 characters)."],
    ["Generic Name", "Yes", "Active ingredient / generic name."],
    ["Unit", "Yes", "Base stock unit: Tablet, Capsule, Bottle, Tube, Vial, etc."],
    ["Selling Price", "Yes", "Price per base unit. Must be greater than 0."],
    ["Purchase Price", "Yes", "Cost per base unit. 0 or more."],
    ["Reorder Level", "Yes", "Low-stock threshold (whole number, 0+)."],
    ["Opening Stock", "Yes", "Starting quantity in base units (whole number, 0+)."],
    ["Expiry (YYYY-MM-DD)", "Yes", "Nearest batch expiry date, e.g. 2027-12-31."],
    ["Strength / Strength Unit", "No", "e.g. 500 and mg → stored as 500mg."],
    ["MRP", "No", "Printed price on the pack (0+)."],
    ["Batch Number", "No", "Opening batch number; auto-generated if blank."],
    ["Prescription Required", "No", "yes / no (default no)."],
    ["Category, Brand, Manufacturer, Supplier, SKU, Description", "No", "Optional free text."],
    ["Sub-Package Name + Units per Sub-Package + Price", "No", "e.g. Strip, 10, 70 → 1 Strip = 10 base units at its own price."],
    ["Outer Pack Name + Sub-Packages per Outer + Price", "No", "e.g. Carton, 100, 7000 → 1 Carton = 100 Strips = 1,000 base units."],
    ["Allow Retail (yes/no)", "No", "Can it be sold as a single base unit? Default yes."],
    ["Allow Wholesale (yes/no)", "No", "Can it be sold in POS wholesale mode? Default yes."],
    ["—", "—", "Each medicine must have a unique Name + Strength in your pharmacy. Duplicates are rejected."],
  ];
  rules.forEach((r) => notes.addRow(r));

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(buf as ArrayBuffer, "medicines-template.xlsx");
}

/** Read an uploaded .xlsx into raw keyed rows (by column key). */
export async function parseMedicinesXlsx(file: File): Promise<ParsedRow[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];

  // Map the sheet's header cells to our column keys (trim + case-insensitive, ignore trailing *).
  const headerRow = ws.getRow(1);
  const norm = (s: string) => s.trim().toLowerCase().replace(/\*/g, "").replace(/\s*\(.*\)\s*/g, "").trim();
  const headerToKey = new Map<number, string>();
  headerRow.eachCell((cell, col) => {
    const label = norm(String(cell.value ?? ""));
    const match = MEDICINE_COLUMNS.find((c) => norm(c.header) === label);
    if (match) headerToKey.set(col, match.key);
  });

  const cellText = (v: unknown): string => {
    if (v == null) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "object" && v && "text" in (v as Record<string, unknown>)) return String((v as { text: unknown }).text);
    if (typeof v === "object" && v && "result" in (v as Record<string, unknown>)) return String((v as { result: unknown }).result);
    return String(v);
  };

  const rows: ParsedRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const raw: Record<string, unknown> = {};
    let hasAny = false;
    headerToKey.forEach((key, col) => {
      const text = cellText(row.getCell(col).value).trim();
      raw[key] = text;
      if (text) hasAny = true;
    });
    if (hasAny) rows.push({ row: rowNumber, raw });
  });
  return rows;
}

const isBlank = (v: unknown) => v == null || String(v).trim() === "";
const asNumber = (v: unknown) => (isBlank(v) ? NaN : Number(String(v).replace(/,/g, "").trim()));
const truthy = (v: unknown) => /^(yes|y|true|1|required)$/i.test(String(v ?? "").trim());

/**
 * Validate parsed rows. Returns a per-row verdict (valid medicine or error list),
 * checking required fields, number/date validity, and duplicate Name+Strength
 * both within the file and against the pharmacy's existing medicines.
 */
export function validateImportRows(rows: ParsedRow[], existing: Medicine[]): ValidatedRow[] {
  const existingKeys = new Set(
    existing.map((m) => `${m.name.trim().toLowerCase()}|${(m.strength ?? "").trim().toLowerCase()}`),
  );
  const seenInFile = new Set<string>();

  return rows.map(({ row, raw }) => {
    const errors: string[] = [];
    const g = (k: string) => String(raw[k] ?? "").trim();

    const name = g("name");
    const genericName = g("genericName");
    const unit = g("unit");
    if (name.length < 2) errors.push("Name is required (min 2 characters).");
    if (!genericName) errors.push("Generic Name is required.");
    if (!unit) errors.push("Unit is required.");

    const sellingPrice = asNumber(raw.sellingPrice);
    const purchasePrice = asNumber(raw.purchasePrice);
    const reorderLevel = asNumber(raw.reorderLevel);
    const stock = asNumber(raw.stock);
    if (!(sellingPrice > 0)) errors.push("Selling Price must be a number greater than 0.");
    if (!(purchasePrice >= 0)) errors.push("Purchase Price must be a number (0 or more).");
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) errors.push("Reorder Level must be a whole number (0+).");
    if (!Number.isInteger(stock) || stock < 0) errors.push("Opening Stock must be a whole number (0+).");

    let mrp: number | undefined;
    if (!isBlank(raw.mrp)) {
      const m = asNumber(raw.mrp);
      if (!(m >= 0)) errors.push("MRP must be a number (0 or more).");
      else mrp = m;
    }

    const expiryRaw = g("expiry");
    let expiry = "";
    if (!expiryRaw) errors.push("Expiry is required (YYYY-MM-DD).");
    else {
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(expiryRaw) ? `${expiryRaw}T00:00:00` : expiryRaw);
      if (isNaN(d.getTime())) errors.push(`Expiry "${expiryRaw}" is not a valid date (use YYYY-MM-DD).`);
      else expiry = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const strength = combineStrength(g("strengthValue"), g("strengthUnit"));
    const dupKey = `${name.trim().toLowerCase()}|${strength.trim().toLowerCase()}`;
    if (name.length >= 2) {
      if (existingKeys.has(dupKey)) errors.push(`"${[name, strength].filter(Boolean).join(" ")}" already exists in your pharmacy.`);
      else if (seenInFile.has(dupKey)) errors.push(`Duplicate of an earlier row in this file ("${[name, strength].filter(Boolean).join(" ")}").`);
    }
    // Packaging (optional): build Sub (of base) and Outer (of Sub, or base) packs.
    const packInput: MedicineUnit[] = [];
    const subName = g("subName");
    const outerName = g("outerName");
    if (subName) {
      const su = asNumber(raw.subUnits);
      const sp = asNumber(raw.subPrice);
      if (!Number.isInteger(su) || su < 2) errors.push('"Units per Sub-Package" must be a whole number of 2 or more.');
      if (!(sp > 0)) errors.push('"Sub-Package Price" must be greater than 0.');
      if (Number.isInteger(su) && su >= 2 && sp > 0) packInput.push({ name: subName, contains: su, of: "", price: sp, factor: 0 });
    }
    if (outerName) {
      const ou = asNumber(raw.outerUnits);
      const op = asNumber(raw.outerPrice);
      if (!Number.isInteger(ou) || ou < 2) errors.push('"Sub-Packages per Outer" must be a whole number of 2 or more.');
      if (!(op > 0)) errors.push('"Outer Pack Price" must be greater than 0.');
      if (Number.isInteger(ou) && ou >= 2 && op > 0) packInput.push({ name: outerName, contains: ou, of: subName || "", price: op, factor: 0 });
    }
    let packUnits: MedicineUnit[] | undefined;
    if (packInput.length > 0) {
      const resolved = resolvePackUnits(packInput, unit);
      const packErr = validatePackUnits(resolved, unit);
      if (packErr) errors.push(packErr);
      else packUnits = resolved;
    }

    if (errors.length === 0) seenInFile.add(dupKey);

    if (errors.length > 0) return { row, errors };

    const medicine: Medicine = {
      id: crypto.randomUUID(),
      name,
      genericName,
      category: g("category"),
      brand: g("brand"),
      manufacturer: g("manufacturer"),
      dosageForm: g("dosageForm"),
      strength,
      strengthUnit: g("strengthUnit") || undefined,
      unit,
      sellingPrice,
      purchasePrice,
      mrp,
      supplier: g("supplier") || undefined,
      reorderLevel,
      stock,
      prescriptionRequired: truthy(raw.prescriptionRequired),
      description: g("description"),
      expiry,
      status: "healthy", // server recomputes on create
      sku: g("sku"),
      ...(packUnits ? { packUnits } : {}),
      ...(isBlank(raw.allowRetail) ? {} : { allowLoose: truthy(raw.allowRetail) }),
      ...(isBlank(raw.allowWholesale) ? {} : { allowWholesale: truthy(raw.allowWholesale) }),
      ...(g("openingBatchNumber") ? { openingBatchNumber: g("openingBatchNumber") } : {}),
    } as Medicine;

    return { row, medicine, errors: [] };
  });
}
