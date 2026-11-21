"use client";

import type { CartItem } from "./types";

export interface ThermalReceipt {
  pharmacyName: string;
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

/** Build an 80mm thermal-printer-friendly HTML receipt. */
export function buildThermalReceiptHtml(d: ThermalReceipt): string {
  const dateStr = new Date().toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  const rows = d.items
    .map((i) => {
      const line = i.price * i.quantity;
      const name = `${i.name}${i.strength ? ` ${i.strength}` : ""}`;
      return `<div class="it"><div class="nm">${esc(name)}</div><div class="ln"><span>${i.quantity} ${esc(i.unit)} x ${money(i.price)}</span><span>${money(line)}</span></div></div>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.invoice)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 80mm; margin: 0; padding: 4mm 3mm; font-family: "Courier New", monospace; font-size: 12px; line-height: 1.35; color: #000; }
  .c { text-align: center; } .b { font-weight: bold; } .big { font-size: 15px; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .it { margin: 3px 0; } .it .nm { font-weight: bold; } .it .ln { display: flex; justify-content: space-between; }
  .muted { font-size: 11px; }
</style></head><body>
  <div class="c b big">${esc(d.pharmacyName)}</div>
  <div class="c muted">Sales Receipt${d.saleType === "wholesale" ? " (Wholesale)" : ""}</div>
  <div class="hr"></div>
  <div class="row muted"><span>Invoice</span><span>${esc(d.invoice)}</span></div>
  <div class="row muted"><span>Date</span><span>${esc(dateStr)}</span></div>
  <div class="row muted"><span>Cashier</span><span>${esc(d.cashier)}</span></div>
  <div class="row muted"><span>Customer</span><span>${esc(d.customer)}</span></div>
  <div class="hr"></div>
  ${rows}
  <div class="hr"></div>
  <div class="row"><span>Subtotal</span><span>${money(d.subtotal)}</span></div>
  ${d.discount > 0 ? `<div class="row"><span>Discount</span><span>-${money(d.discount)}</span></div>` : ""}
  ${d.tax > 0 ? `<div class="row"><span>Tax</span><span>${money(d.tax)}</span></div>` : ""}
  <div class="row b big"><span>TOTAL</span><span>Rs ${money(d.total)}</span></div>
  <div class="row muted"><span>Paid (${esc(d.payment)})</span><span>${money(d.paid)}</span></div>
  ${d.change > 0 ? `<div class="row muted"><span>Change</span><span>${money(d.change)}</span></div>` : ""}
  ${d.outstanding > 0 ? `<div class="row muted b"><span>Balance due</span><span>${money(d.outstanding)}</span></div>` : ""}
  <div class="hr"></div>
  <div class="c muted">Thank you for your purchase!</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},400);};</script>
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
