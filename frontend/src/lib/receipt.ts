"use client";

import type { CartItem, Sale } from "./types";

export interface ThermalReceipt {
  // Pharmacy identity (tenant-specific, from the pharmacies profile/settings).
  pharmacyName: string;
  pharmacyLogo?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyLicense?: string;
  pharmacyTaxId?: string;
  // Sale.
  invoice: string;
  cashier: string;
  customer: string;
  saleType: "retail" | "wholesale";
  payment: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  outstanding: number;
}

const money = (n: number) => n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

/**
 * Inner receipt markup (no <html>/print scaffolding) — reused by the printer and
 * any on-screen preview. Columns align on 58mm and 80mm; pharmacy name + TOTAL
 * are bold; phone always shows (— if not set yet).
 */
export function receiptInnerHtml(d: ThermalReceipt): string {
  const dateStr = new Date().toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  const header = [
    d.pharmacyLogo ? `<img class="logo" src="${esc(d.pharmacyLogo)}" alt="">` : "",
    `<div class="c name">${esc(d.pharmacyName || "Pharmacy")}</div>`,
    d.pharmacyAddress ? `<div class="c sub">${esc(d.pharmacyAddress)}</div>` : "",
    `<div class="c sub">Tel: ${esc(d.pharmacyPhone || "—")}</div>`,
    d.pharmacyLicense ? `<div class="c sub">Lic: ${esc(d.pharmacyLicense)}</div>` : "",
    d.pharmacyTaxId ? `<div class="c sub">NTN: ${esc(d.pharmacyTaxId)}</div>` : "",
    `<div class="c sub">Sales Receipt${d.saleType === "wholesale" ? " (Wholesale)" : ""}</div>`,
  ].join("");

  const meta = [
    ["Invoice", d.invoice],
    ["Date", dateStr],
    ["Cashier", d.cashier],
    ["Customer", d.customer],
  ].map(([k, v]) => `<div class="row meta"><span>${esc(k)}</span><span class="r">${esc(v)}</span></div>`).join("");

  // A labelled 2-column header (Item · Amount) so the item rows read as clean
  // columns at any width, then one block per item: name on its own line, then
  // "qty unit × unitPrice" (secondary, may wrap) left + the line amount right.
  // The amount column is tabular + nowrap, so prices never wrap or collide.
  const itemsHeader = `<div class="row ih"><span>Item</span><span class="r">Amount</span></div>`;
  const items = d.items.map((i) => {
    const name = `${i.name}${i.strength ? ` ${i.strength}` : ""}`;
    return `<div class="it"><div class="nm">${esc(name)}</div><div class="ln"><span class="q">${i.quantity} ${esc(i.unit)} × ${money(i.price)}</span><span class="amt">${money(i.price * i.quantity)}</span></div></div>`;
  }).join("");

  const totals = [
    `<div class="row"><span>Subtotal</span><span class="r">${money(d.subtotal)}</span></div>`,
    d.discount > 0 ? `<div class="row"><span>Discount</span><span class="r">-${money(d.discount)}</span></div>` : "",
    d.tax > 0 ? `<div class="row"><span>Tax</span><span class="r">${money(d.tax)}</span></div>` : "",
    `<div class="row tot"><span>TOTAL</span><span class="r">Rs ${money(d.total)}</span></div>`,
    `<div class="row meta"><span>Paid (${esc(d.payment)})</span><span class="r">${money(d.paid)}</span></div>`,
    d.change > 0 ? `<div class="row meta"><span>Change</span><span class="r">${money(d.change)}</span></div>` : "",
    d.outstanding > 0 ? `<div class="row meta b"><span>Balance due</span><span class="r">${money(d.outstanding)}</span></div>` : "",
  ].join("");

  return `${header}<div class="hr"></div>${meta}<div class="hr"></div>${itemsHeader}${items}<div class="hr"></div>${totals}<div class="hr"></div><div class="c foot">Thank you for your purchase!</div><div class="c foot dim">Powered by MediCare</div>`;
}

/** Thermal receipt CSS. Fluid by default so it fills the printer's paper (58 or 80mm). */
export const RECEIPT_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 2mm 3mm; width: 100%; font-family: "Courier New", ui-monospace, monospace; font-size: 13px; line-height: 1.4; color: #000; }
  .c { text-align: center; }
  .logo { display: block; max-width: 44%; max-height: 64px; margin: 0 auto 3px; filter: grayscale(1) contrast(1.3); }
  .name { font-size: 18px; font-weight: 800; letter-spacing: .3px; }
  .sub { font-size: 11px; }
  .meta { font-size: 11px; }
  .b { font-weight: 700; }
  .dim { color: #555; }
  .hr { border-top: 1px dashed #000; margin: 5px 0; }
  /* Money columns are tabular + nowrap so amounts never wrap or collide. */
  .row { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
  .row .r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ih { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
  .it { margin: 3px 0; }
  .it .nm { font-weight: 700; }
  /* Detail line: "qty unit × price" may shrink/wrap (secondary); amount stays put. */
  .it .ln { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; font-size: 12px; }
  .it .ln .q { flex: 1 1 auto; min-width: 0; color: #222; }
  .it .ln .amt { flex: 0 0 auto; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .tot { font-size: 16px; font-weight: 800; margin-top: 2px; }
  .foot { font-size: 10px; }
  /* 58mm roll: tighten everything so a full line fits without wrapping. */
  .narrow { padding: 1.5mm 2mm; font-size: 11px; }
  .narrow .name { font-size: 15px; }
  .narrow .sub, .narrow .meta, .narrow .ih { font-size: 10px; }
  .narrow .it .ln { font-size: 10px; gap: 5px; }
  .narrow .tot { font-size: 14px; }
`;

/** Full print document. `widthMm` fixes the page width (58/80) for preview; omit for fluid printing. */
export function buildThermalReceiptHtml(d: ThermalReceipt, widthMm?: number): string {
  const pageCss = widthMm
    ? `@page { size: ${widthMm}mm auto; margin: 0; } body { width: ${widthMm}mm; }`
    : `@page { margin: 0; }`;
  // 58mm rolls get the compact "narrow" variant so lines fit without wrapping.
  const bodyClass = widthMm && widthMm <= 60 ? ' class="narrow"' : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.invoice)}</title>
<style>${pageCss}${RECEIPT_CSS}</style></head><body${bodyClass}>${receiptInnerHtml(d)}
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};</script>
</body></html>`;
}

/** Supported thermal roll widths (mm). */
export type ReceiptWidth = 58 | 80;

/** Pharmacy identity for a receipt (from the signed-in tenant profile). */
export interface ReceiptPharmacy {
  name?: string;
  logo?: string;
  address?: string;
  phone?: string;
  license?: string;
  taxId?: string;
}

/**
 * Build a thermal receipt from a STORED sale — used to reprint an invoice on the
 * roll printer, a faithful copy of the original. `medicineName` already includes
 * the strength (the server concatenates it), so `strength` is left blank here.
 * Sales created before change-tracking simply have change = 0 (no Change line).
 */
export function thermalReceiptFromSale(sale: Sale, pharmacy: ReceiptPharmacy): ThermalReceipt {
  return {
    pharmacyName: pharmacy.name || "Pharmacy",
    pharmacyLogo: pharmacy.logo || undefined,
    pharmacyAddress: pharmacy.address || undefined,
    pharmacyPhone: pharmacy.phone || undefined,
    pharmacyLicense: pharmacy.license || undefined,
    pharmacyTaxId: pharmacy.taxId || undefined,
    invoice: sale.invoice,
    cashier: sale.cashierName || "Cashier",
    customer: sale.customer,
    saleType: sale.saleType === "wholesale" ? "wholesale" : "retail",
    payment: sale.payment,
    items: sale.items.map((it, idx): CartItem => ({
      key: `${it.medicineId ?? idx}__${it.unit ?? ""}`,
      medicineId: it.medicineId ?? "",
      name: it.medicineName,
      genericName: "",
      strength: "",
      unit: it.unit ?? "",
      factor: it.factor ?? 1,
      price: it.price,
      quantity: it.quantity,
      stock: 0,
      prescriptionRequired: false,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    paid: sale.amountPaid ?? sale.total,
    change: sale.change ?? 0,
    outstanding: sale.outstanding ?? 0,
  };
}

/** Open the thermal receipt in a print window and trigger the print dialog.
 * `widthMm` selects the paper roll (58mm or 80mm); defaults to the 80mm standard. */
export function printThermalReceipt(d: ThermalReceipt, widthMm: ReceiptWidth = 80): boolean {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return false; // popup blocked
  w.document.open();
  w.document.write(buildThermalReceiptHtml(d, widthMm));
  w.document.close();
  return true;
}
