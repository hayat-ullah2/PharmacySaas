"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { MEDICINES, CATEGORIES, BRANDS, MANUFACTURERS } from "@/lib/data";
import { DOSAGE_FORMS, MEDICINE_UNITS as UNITS } from "@/lib/medicineOptions";
import { usePharmacyData } from "@/lib/pharmacyData";
import { useToast } from "@/lib/toast";
import type { Medicine } from "@/lib/types";

/**
 * Edit a medicine's catalog details. Stock and expiry are intentionally NOT
 * editable here — they are managed via Batches / Stock Adjustments so that
 * medicine.stock stays equal to the sum of its batch quantities (FEFO).
 * Mount conditionally: {editing && <MedicineEditModal medicine={editing} .../>}.
 */
export function MedicineEditModal({
  medicine,
  onClose,
  onSaved,
}: {
  medicine: Medicine;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { saveRecord } = usePharmacyData();
  const { toast } = useToast();
  const [form, setForm] = useState<Medicine>({ ...medicine });
  const [saving, setSaving] = useState(false);

  const upd = (patch: Partial<Medicine>) => setForm((cur) => ({ ...cur, ...patch }));

  const save = async () => {
    const trimmedName = form.name.trim();
    const strength = (form.strength ?? "").trim();
    if (trimmedName.length < 2) {
      toast({ type: "warning", title: "Name required", description: "Enter a medicine name (at least 2 characters)." });
      return;
    }
    if (!(form.sellingPrice > 0)) {
      toast({ type: "warning", title: "Invalid price", description: "Selling price must be greater than 0." });
      return;
    }
    if (form.purchasePrice < 0 || form.reorderLevel < 0) {
      toast({ type: "warning", title: "Invalid value", description: "Purchase price and reorder level cannot be negative." });
      return;
    }
    const duplicate = MEDICINES.some(
      (m) =>
        m.id !== form.id &&
        m.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (m.strength ?? "").trim().toLowerCase() === strength.toLowerCase(),
    );
    if (duplicate) {
      toast({ type: "warning", title: "Already exists", description: `A medicine named "${[trimmedName, strength].filter(Boolean).join(" ")}" already exists.` });
      return;
    }

    setSaving(true);
    try {
      // Spread the existing record first so stock / expiry / status / image are preserved.
      await saveRecord("medicines", {
        ...form,
        name: trimmedName,
        genericName: form.genericName.trim(),
        strength,
        sku: (form.sku ?? "").trim(),
        description: (form.description ?? "").trim(),
      });
      toast({ type: "success", title: "Medicine updated", description: `${trimmedName} saved.` });
      onSaved?.();
      onClose();
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to update medicine", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => { if (!saving) onClose(); }}
      title="Edit Medicine"
      description="Update catalog details. Stock and expiry are managed from Batches and Stock Adjustments."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!form.name.trim()}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Medicine name" value={form.name} onChange={(e) => upd({ name: e.target.value })} />
          <Input label="Generic name" value={form.genericName} onChange={(e) => upd({ genericName: e.target.value })} />
          <Select label="Category" value={form.category} onChange={(e) => upd({ category: e.target.value })} placeholder="Select category" options={CATEGORIES.map((c) => ({ value: c.name, label: c.name }))} />
          <Select label="Brand" value={form.brand} onChange={(e) => upd({ brand: e.target.value })} placeholder="Select brand" options={BRANDS.map((b) => ({ value: b.name, label: b.name }))} />
          <Select label="Manufacturer" value={form.manufacturer} onChange={(e) => upd({ manufacturer: e.target.value })} placeholder="Select manufacturer" options={MANUFACTURERS.map((m) => ({ value: m.name, label: m.name }))} />
          <Select label="Dosage form" value={form.dosageForm} onChange={(e) => upd({ dosageForm: e.target.value })} placeholder="Select form" options={DOSAGE_FORMS.map((d) => ({ value: d, label: d }))} />
          <Input label="Strength" value={form.strength} onChange={(e) => upd({ strength: e.target.value })} />
          <Select label="Unit" value={form.unit} onChange={(e) => upd({ unit: e.target.value })} placeholder="Select unit" options={UNITS.map((u) => ({ value: u, label: u }))} />
          <Input label="Selling price (Rs)" type="number" min={0} step="0.01" value={form.sellingPrice} onChange={(e) => upd({ sellingPrice: Number(e.target.value) })} />
          <Input label="Purchase price (Rs)" type="number" min={0} step="0.01" value={form.purchasePrice} onChange={(e) => upd({ purchasePrice: Number(e.target.value) })} />
          <Input label="Reorder level" type="number" min={0} value={form.reorderLevel} onChange={(e) => upd({ reorderLevel: Number(e.target.value) })} />
          <Input label="SKU / Barcode" value={form.sku ?? ""} onChange={(e) => upd({ sku: e.target.value })} />
        </div>
        <Toggle label="Prescription required" checked={form.prescriptionRequired} onChange={(v) => upd({ prescriptionRequired: v })} />
        <Textarea label="Description" rows={3} value={form.description ?? ""} onChange={(e) => upd({ description: e.target.value })} />
      </div>
    </Modal>
  );
}
