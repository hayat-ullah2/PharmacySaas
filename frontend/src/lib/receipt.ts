"use client";

import type { CartItem } from "./types";

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

  const items = d.items.map((i) => {
    const name = `${i.name}${i.strength ? ` ${i.strength}` : ""}`;
    return `<div class="it"><div class="nm">${esc(name)}</div><div class="ln"><span class="q">${i.quantity} ${esc(i.unit)} x ${money(i.price)}</span><span class="amt">${money(i.price * i.quantity)}</span></div></div>`;
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

  return `${header}<div class="hr"></div>${meta}<div class="hr"></div>${items}<div class="hr"></div>${totals}<div class="hr"></div><div class="c foot">Thank you for your purchase!</div><div class="c foot dim">Powered by MediCare</div>`;
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
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row .r { text-align: right; white-space: nowrap; }
  .it { margin: 2px 0; }
  .it .nm { font-weight: 700; }
  .it .ln { display: flex; justify-content: space-between; gap: 8px; }
  .it .ln .q { flex: 1 1 auto; }
  .it .ln .amt { text-align: right; white-space: nowrap; }
  .tot { font-size: 16px; font-weight: 800; margin-top: 2px; }
  .foot { font-size: 10px; }
`;

/** Full print document. `widthMm` fixes the page width (58/80) for preview; omit for fluid printing. */
export function buildThermalReceiptHtml(d: ThermalReceipt, widthMm?: number): string {
  const pageCss = widthMm
    ? `@page { size: ${widthMm}mm auto; margin: 0; } body { width: ${widthMm}mm; }`
    : `@page { margin: 0; }`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.invoice)}</title>
<style>${pageCss}${RECEIPT_CSS}</style></head><body>${receiptInnerHtml(d)}
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};</script>
</body></html>`;
}

/** Open the thermal receipt in a print window and trigger the print dialog. */
export function printThermalReceipt(d: ThermalReceipt): boolean {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return false; // popup blocked
  w.document.open();
  w.document.write(buildThermalReceiptHtml(d));
  w.document.close();
  return true;
}
