"use client";

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/**
 * Download the given rows as a CSV file (client-side, from the live data on screen).
 * Returns the number of rows exported so callers can show an accurate toast.
 */
export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): number {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => escape(c.value(r))).join(",")),
  ];
  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return rows.length;
}
