"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { getSupabaseClient } from "@/lib/supabase";
import { useToast } from "@/lib/toast";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface EditablePharmacy {
  id: string;
  name: string;
  logo_url: string;
  subscription_price: number;
  subscription_start: string | null;
  subscription_expiry: string | null;
}

/**
 * Edit a pharmacy's name, logo, and subscription. Mount it conditionally
 * (e.g. `{editing && <PharmacyEditModal pharmacy={editing} .../>}`) so its
 * fields initialise fresh from the row — no effects, no stale state.
 */
export function PharmacyEditModal({
  pharmacy,
  onClose,
  onSaved,
}: {
  pharmacy: EditablePharmacy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(pharmacy.name);
  const [logoUrl, setLogoUrl] = useState(pharmacy.logo_url ?? "");
  const [price, setPrice] = useState(String(pharmacy.subscription_price ?? 0));
  const [start, setStart] = useState(pharmacy.subscription_start ?? "");
  const [expiry, setExpiry] = useState(pharmacy.subscription_expiry ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 120) {
      toast({ type: "warning", title: "Check the name", description: "Pharmacy name must be 2–120 characters." });
      return;
    }
    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      toast({ type: "warning", title: "Check the price", description: "Enter a valid price (0 or more)." });
      return;
    }
    if (expiry && start && expiry < start) {
      toast({ type: "warning", title: "Check the dates", description: "Expiry date must be on or after the start date." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await getSupabaseClient()
        .from("pharmacies")
        .update({
          name: trimmedName,
          logo_url: logoUrl.trim(),
          subscription_price: Math.round(priceNumber * 100) / 100,
          // start is NOT NULL in the DB — fall back to today if the field was cleared.
          subscription_start: start || todayIso(),
          subscription_expiry: expiry || null,
        })
        .eq("id", pharmacy.id);
      if (error) throw error;
      toast({ type: "success", title: "Pharmacy updated", description: trimmedName });
      onSaved();
      onClose();
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save changes", description: saveError instanceof Error ? saveError.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => { if (!saving) onClose(); }}
      title="Edit pharmacy"
      description="Update the pharmacy details and subscription."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={name.trim().length < 2}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <ImageUpload value={logoUrl} onChange={setLogoUrl} folder="pharmacy-logos" label="Pharmacy logo" />
        <Input label="Pharmacy name" value={name} onChange={(e) => setName(e.target.value)} />

        <div className="border-t border-navy-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-navy-800">Subscription</p>
          <div className="space-y-4">
            <Input
              label="Price (Rs)"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 5000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              hint="Set a custom amount for this pharmacy. Use 0 for a free account."
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input
                label="Expiry date"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                hint="Blank = no expiry. On expiry, the pharmacy is cut off automatically."
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
