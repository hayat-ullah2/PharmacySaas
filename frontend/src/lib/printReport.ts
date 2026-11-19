"use client";

import type { Sale } from "./types";
import { formatDate } from "./utils";

export interface ReportMeta {
  pharmacyName: string;
  title: string;
  rangeLabel: string;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const money = (n: number) => `Rs ${Math.round(n || 0).toLocaleString("en-PK")}`;

function groupSum(sales: Sale[], key: (s: Sale) => string): Record<string, { count: number; total: number }> {
  const out: Record<string, { count: number; total: number }> = {};
  for (const s of sales) {
    const k = key(s);
    out[k] = out[k] || { count: 0, total: 0 };
    out[k].count += 1;
    out[k].total += s.total;
  }
  return out;
}

const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 28px 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #64748b; font-size: 12px; margin: 0; }
  .meta { color: #334155; font-size: 12px; margin-top: 6px; }
  .cards { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0; }
  .card { flex: 1 1 140px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .card .l { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  .card .v { font-size: 17px; font-weight: 700; margin-top: 2px; }
  h2 { font-size: 13px; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
  td.r, th.r { text-align: right; }
  tfoot td { font-weight: 700; border-top: 2px solid #cbd5e1; }
  .flex2 { display: flex; gap: 24px; flex-wrap: wrap; }
  .flex2 > div { flex: 1 1 240px; }
  .foot { margin-top: 22px; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { padding: 0; } @page { margin: 14mm; } }
`;

/** Build a self-contained, print-friendly HTML sales report (also used for Word export). */
export function buildSalesReportHtml(sales: Sale[], meta: ReportMeta): string {
  const sum = (f: (s: Sale) => number) => sales.reduce((a, s) => a + (f(s) || 0), 0);
  const totalSales = sum((s) => s.total);
  const subtotal = sum((s) => s.subtotal);
  const discount = sum((s) => s.discount);
  const tax = sum((s) => s.tax);
  const itemsSold = sum((s) => s.itemCount);
  const invoices = sales.length;
  const aov = invoices ? totalSales / invoices : 0;
  const paid = sum((s) => s.amountPaid ?? s.total);
  const outstanding = sum((s) => s.outstanding ?? 0);
  const refunded = sum((s) => s.returnedAmount ?? 0);

  const byPayment = groupSum(sales, (s) => s.payment || "other");
  const byType = groupSum(sales, (s) => s.saleType || "retail");

  const breakdownRows = (g: Record<string, { count: number; total: number }>) =>
    Object.entries(g)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([k, v]) => `<tr><td style="text-transform:capitalize">${esc(k)}</td><td class="r">${v.count}</td><td class="r">${money(v.total)}</td></tr>`)
      .join("") || `<tr><td colspan="3" style="color:#94a3b8">No data</td></tr>`;

  const detailRows = sales
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.invoice.localeCompare(b.invoice))
    .map(
      (s) => `<tr>
        <td>${esc(s.invoice)}</td>
        <td>${esc(s.customer)}</td>
        <td style="text-transform:capitalize">${esc(s.saleType || "retail")}</td>
        <td class="r">${s.itemCount}</td>
        <td class="r">${money(s.discount)}</td>
        <td class="r">${money(s.total)}</td>
        <td style="text-transform:capitalize">${esc(s.payment)}</td>
        <td style="text-transform:capitalize">${esc(s.status)}</td>
        <td>${esc(formatDate(s.date))}</td>
      </tr>`,
    )
    .join("") || `<tr><td colspan="9" style="color:#94a3b8">No sales in this period.</td></tr>`;

  const card = (l: string, v: string) => `<div class="card"><div class="l">${esc(l)}</div><div class="v">${v}</div></div>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(meta.title)} — ${esc(meta.pharmacyName)}</title><style>${REPORT_CSS}</style></head>
<body>
  <h1>${esc(meta.pharmacyName)}</h1>
  <p class="sub">${esc(meta.title)}</p>
  <p class="meta"><strong>Period:</strong> ${esc(meta.rangeLabel)} &nbsp;·&nbsp; <strong>Generated:</strong> ${esc(formatDate(new Date().toISOString().slice(0, 10)))}</p>

  <div class="cards">
    ${card("Total Sales", money(totalSales))}
    ${card("Invoices", String(invoices))}
    ${card("Items Sold", String(itemsSold))}
    ${card("Avg Invoice", money(aov))}
  </div>
  <div class="cards">
    ${card("Subtotal", money(subtotal))}
    ${card("Discounts", money(discount))}
    ${card("Tax", money(tax))}
    ${card("Collected", money(paid))}
    ${card("Outstanding", money(outstanding))}
    ${card("Refunded", money(refunded))}
  </div>

  <div class="flex2">
    <div>
      <h2>By payment method</h2>
      <table><thead><tr><th>Method</th><th class="r">Invoices</th><th class="r">Total</th></tr></thead>
      <tbody>${breakdownRows(byPayment)}</tbody></table>
    </div>
    <div>
      <h2>By sale type</h2>
      <table><thead><tr><th>Type</th><th class="r">Invoices</th><th class="r">Total</th></tr></thead>
      <tbody>${breakdownRows(byType)}</tbody></table>
    </div>
  </div>

  <h2>Invoices (${invoices})</h2>
  <table>
    <thead><tr>
      <th>Invoice</th><th>Customer</th><th>Type</th><th class="r">Items</th>
      <th class="r">Discount</th><th class="r">Total</th><th>Payment</th><th>Status</th><th>Date</th>
    </tr></thead>
    <tbody>${detailRows}</tbody>
    <tfoot><tr>
      <td colspan="3">Total</td><td class="r">${itemsSold}</td>
      <td class="r">${money(discount)}</td><td class="r">${money(totalSales)}</td><td colspan="3"></td>
    </tr></tfoot>
  </table>

  <p class="foot">This report is scoped to ${esc(meta.pharmacyName)} only. Figures are computed from completed sales in the selected period.</p>
</body></html>`;
}

/** Open the report in a new window and trigger the browser's Print → Save as PDF. */
export function printReportHtml(html: string): boolean {
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  // Give the new document a tick to lay out before printing.
  setTimeout(() => {
    try { w.print(); } catch { /* user can print manually */ }
  }, 350);
  return true;
}

/** Download the report HTML as a .doc that opens cleanly in Microsoft Word. */
export function downloadReportDoc(filename: string, html: string): void {
  const blob = new Blob(["﻿", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
