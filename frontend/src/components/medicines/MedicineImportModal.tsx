"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getSupabaseClient } from "@/lib/supabase";
import { parseMedicinesXlsx, validateImportRows, downloadMedicineTemplate, type ValidatedRow } from "@/lib/medicineXlsx";
import { useToast } from "@/lib/toast";
import type { Medicine } from "@/lib/types";

/**
 * Bulk-import medicines from an .xlsx. Parses + validates every row, shows a
 * preview (ready vs errors), and only writes after the user confirms. Each
 * confirmed row goes through create_medicine (server-side tenant + validation +
 * duplicate guard), so bad data is never silently added.
 */
export function MedicineImportModal({
  open,
  onClose,
  existing,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  existing: Medicine[];
  onImported: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ValidatedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; failures: { row: number; msg: string }[] } | null>(null);

  const valid = rows?.filter((r) => r.medicine) ?? [];
  const errored = rows?.filter((r) => !r.medicine) ?? [];

  const reset = () => { setFileName(""); setRows(null); setResult(null); if (fileRef.current) fileRef.current.value = ""; };
  const close = () => { if (!importing) { reset(); onClose(); } };

  const onFile = async (file: File) => {
    setParsing(true);
    setRows(null);
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = await parseMedicinesXlsx(file);
      if (parsed.length === 0) {
        toast({ type: "warning", title: "No rows found", description: "The sheet has no data rows under the header." });
        setRows([]);
        return;
      }
      setRows(validateImportRows(parsed, existing));
    } catch (e) {
      toast({ type: "danger", title: "Couldn't read the file", description: e instanceof Error ? e.message : "Make sure it's a valid .xlsx file." });
      setRows(null);
    } finally {
      setParsing(false);
    }
  };

  const doImport = async () => {
    if (valid.length === 0) return;
    setImporting(true);
    const client = getSupabaseClient();
    const failures: { row: number; msg: string }[] = [];
    let added = 0;
    for (const r of valid) {
      const { error } = await client.rpc("create_medicine", { p_medicine: r.medicine });
      if (error) failures.push({ row: r.row, msg: error.message });
      else added += 1;
    }
    await onImported();
    setResult({ added, failures });
    setImporting(false);
    toast(added > 0
      ? { type: "success", title: "Import complete", description: `${added} medicine(s) added${failures.length ? `, ${failures.length} failed` : ""}.` }
      : { type: "danger", title: "Nothing imported", description: "Every row was rejected by the server." });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import medicines from Excel"
      description="Upload a filled template. Rows are validated and previewed — nothing is added until you confirm."
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={importing}>Cancel</Button>
            <Button onClick={doImport} loading={importing} disabled={valid.length === 0}>
              <Upload className="h-4 w-4" /> Import {valid.length || ""} medicine{valid.length === 1 ? "" : "s"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {!result && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadMedicineTemplate()}>
                <Download className="h-4 w-4" /> Download template
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={parsing}>
                <FileSpreadsheet className="h-4 w-4" /> {fileName || "Choose .xlsx file"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              />
            </div>
            <p className="text-xs text-navy-400">
              Required columns: Name, Generic Name, Unit, Selling Price, Purchase Price, Reorder Level, Opening Stock, Expiry.
              Each medicine must have a unique Name + Strength.
            </p>
          </>
        )}

        {rows && !result && (
          <div className="rounded-lg border border-navy-100">
            <div className="flex flex-wrap gap-4 border-b border-navy-100 p-3 text-sm">
              <span className="text-navy-500">{rows.length} row(s) read</span>
              <span className="inline-flex items-center gap-1 font-medium text-success-700"><CheckCircle2 className="h-4 w-4" /> {valid.length} ready</span>
              <span className="inline-flex items-center gap-1 font-medium text-danger-600"><AlertTriangle className="h-4 w-4" /> {errored.length} with errors</span>
            </div>

            {errored.length > 0 && (
              <div className="max-h-44 overflow-y-auto border-b border-navy-100 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger-600">Rows that will be skipped</p>
                <ul className="space-y-1 text-xs text-navy-600">
                  {errored.map((r) => (
                    <li key={r.row}><span className="font-medium text-navy-800">Row {r.row}:</span> {r.errors.join(" ")}</li>
                  ))}
                </ul>
              </div>
            )}

            {valid.length > 0 && (
              <div className="max-h-44 overflow-y-auto p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-success-700">Will be added</p>
                <ul className="space-y-0.5 text-xs text-navy-600">
                  {valid.slice(0, 50).map((r) => (
                    <li key={r.row}>{r.medicine!.name} {r.medicine!.strength} · {r.medicine!.stock} {r.medicine!.unit} · Rs {r.medicine!.sellingPrice}</li>
                  ))}
                  {valid.length > 50 && <li className="text-navy-400">…and {valid.length - 50} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-navy-100 p-3 text-sm">
            <p className="inline-flex items-center gap-1.5 font-medium text-success-700"><CheckCircle2 className="h-4 w-4" /> {result.added} medicine(s) added to your pharmacy.</p>
            {result.failures.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-danger-600">{result.failures.length} rejected by the server</p>
                <ul className="mt-1 space-y-1 text-xs text-navy-600">
                  {result.failures.map((f) => (
                    <li key={f.row}><span className="font-medium text-navy-800">Row {f.row}:</span> {f.msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
