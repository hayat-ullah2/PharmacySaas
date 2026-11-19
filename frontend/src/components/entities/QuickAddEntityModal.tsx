"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, BRANDS, MANUFACTURERS, SUPPLIERS } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { useToast } from "@/lib/toast";

export type EntityKind = "brands" | "categories" | "manufacturers" | "suppliers";

const META: Record<EntityKind, { title: string; label: string; placeholder: string; noun: string }> = {
  brands: { title: "Add brand", label: "Brand name", placeholder: "e.g. company or brand name", noun: "Brand" },
  categories: { title: "Add category", label: "Category name", placeholder: "e.g. Pain Relief", noun: "Category" },
  manufacturers: { title: "Add manufacturer", label: "Manufacturer name", placeholder: "e.g. GSK", noun: "Manufacturer" },
  suppliers: { title: "Add supplier", label: "Supplier name", placeholder: "e.g. Muller & Phipps", noun: "Supplier" },
};

const existingNames = (kind: EntityKind): string[] => {
  const src = kind === "brands" ? BRANDS : kind === "categories" ? CATEGORIES : kind === "manufacturers" ? MANUFACTURERS : SUPPLIERS;
  return [...src].map((x) => x.name.trim().toLowerCase());
};

// Build a full, valid record for the entity with sensible defaults so it renders
// correctly both in the dropdown and on the entity's own page.
function buildRecord(kind: EntityKind, name: string): { id: string } & Record<string, unknown> {
  const id = crypto.randomUUID();
  switch (kind) {
    case "categories":
      return { id, name, description: "", medicineCount: 0, color: "#6366f1" };
    case "brands":
      return { id, name, manufacturer: "", medicineCount: 0 };
    case "manufacturers":
      return { id, name, country: "", contact: "", productCount: 0 };
    case "suppliers":
      return { id, name, contactPerson: "", phone: "", email: "", address: "", totalPurchases: 0, paid: 0, outstanding: 0, status: "active" };
  }
}

/**
 * Quick-add a brand / category / manufacturer / supplier from anywhere (e.g. the
 * medicine form). Saves a valid record, so it appears in the dropdown and on the
 * entity's page, then calls onCreated(name) so the caller can select it.
 */
export function QuickAddEntityModal({
  kind,
  open,
  onClose,
  onCreated,
}: {
  kind: EntityKind | null;
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const { saveRecord } = usePharmacyData();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!kind) return null;
  const meta = META[kind];

  const close = () => { if (!saving) { setName(""); onClose(); } };

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast({ type: "warning", title: "Name required", description: "Enter at least 2 characters." });
      return;
    }
    if (existingNames(kind).includes(trimmed.toLowerCase())) {
      toast({ type: "warning", title: "Already exists", description: `A ${meta.noun.toLowerCase()} named "${trimmed}" already exists.` });
      return;
    }
    setSaving(true);
    try {
      await saveRecord(kind, buildRecord(kind, trimmed));
      toast({ type: "success", title: `${meta.noun} added`, description: `"${trimmed}" is now available.` });
      onCreated(trimmed);
      setName("");
      onClose();
    } catch (e) {
      toast({ type: "danger", title: `Unable to add ${meta.noun.toLowerCase()}`, description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={meta.title}
      description="It will be added to the list and selected here. You can fill in more details on its own page later."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
          <Button loading={saving} disabled={name.trim().length < 2} onClick={save}>Save</Button>
        </>
      }
    >
      <Input
        label={meta.label}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={meta.placeholder}
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
      />
    </Modal>
  );
}
