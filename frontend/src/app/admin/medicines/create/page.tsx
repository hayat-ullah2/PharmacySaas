"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Pill, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { PackagingEditor } from "@/components/medicines/PackagingEditor";
import { QuickAddEntityModal, type EntityKind } from "@/components/entities/QuickAddEntityModal";
import { CATEGORIES, BRANDS, MANUFACTURERS, SUPPLIERS } from "@/lib/data";
import { MEDICINE_UNITS as UNITS, STRENGTH_UNITS, combineStrength } from "@/lib/medicineOptions";
import { validatePackUnits, resolvePackUnits } from "@/lib/units";
import { useToast } from "@/lib/toast";
import { usePharmacyData } from "@/lib/pharmacyData";
import type { MedicineUnit } from "@/lib/types";

export default function CreateMedicinePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createMedicine } = usePharmacyData();
  const [rxRequired, setRxRequired] = useState(false);
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  // Controlled so the packaging editor can show the live base unit + price.
  const [unit, setUnit] = useState("");
  const [sellingPriceStr, setSellingPriceStr] = useState("");
  const [productType, setProductType] = useState("");
  const [packUnits, setPackUnits] = useState<MedicineUnit[]>([]);
  const [allowLoose, setAllowLoose] = useState(true);
  const [allowWholesale, setAllowWholesale] = useState(true);
  // Controlled so a quick-added brand/category/etc. can be auto-selected.
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quickAdd, setQuickAdd] = useState<EntityKind | null>(null);

  const onQuickCreated = (name: string) => {
    if (quickAdd === "brands") setBrand(name);
    else if (quickAdd === "categories") setCategory(name);
    else if (quickAdd === "manufacturers") setManufacturer(name);
    else if (quickAdd === "suppliers") setSupplier(name);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const values = new FormData(e.currentTarget);
      const stock = Number(values.get("stock"));
      const reorderLevel = Number(values.get("reorderLevel"));
      const expiry = String(values.get("expiry"));
      const sellingPrice = Number(values.get("sellingPrice"));
      const purchasePrice = Number(values.get("purchasePrice"));
      if (![stock, reorderLevel, sellingPrice, purchasePrice].every((value) => Number.isFinite(value) && value >= 0)) {
        throw new Error("Stock, reorder level, and prices must be valid non-negative numbers.");
      }
      const mrpStr = String(values.get("mrp") ?? "").trim();
      const mrp = mrpStr ? Number(mrpStr) : undefined;
      if (mrp !== undefined && (!Number.isFinite(mrp) || mrp < 0)) {
        throw new Error("MRP / printed price must be a valid non-negative number.");
      }
      if (!expiry) throw new Error("Enter the nearest expiry date for this medicine.");

      // Only rows that actually have a pack name count — a blank/default row is ignored.
      const cleanPacks = resolvePackUnits(
        packUnits.filter((p) => p.name.trim()),
        String(values.get("unit") ?? ""),
      );
      const packError = validatePackUnits(cleanPacks, String(values.get("unit") ?? ""));
      if (packError) throw new Error(packError);
      if (!allowLoose && cleanPacks.length === 0) {
        throw new Error("This medicine can't be sold: turn ON “Allow retail / partial sales”, or add at least one pack.");
      }

      const today = new Date();
      const daysUntilExpiry = Math.ceil((new Date(`${expiry}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
      const status = daysUntilExpiry < 0
        ? "expired"
        : stock === 0
          ? "out"
          : daysUntilExpiry <= 90
            ? "expiring"
            : stock <= reorderLevel
              ? "low"
              : "healthy";

      await createMedicine({
        id: crypto.randomUUID(),
        name: String(values.get("name")).trim(),
        genericName: String(values.get("genericName")).trim(),
        category: String(values.get("category") ?? ""),
        brand: String(values.get("brand") ?? ""),
        manufacturer: String(values.get("manufacturer") ?? ""),
        dosageForm: unit,
        strength: combineStrength(String(values.get("strengthValue") ?? ""), String(values.get("strengthUnit") ?? "")),
        strengthUnit: String(values.get("strengthUnit") ?? "") || undefined,
        unit: String(values.get("unit") ?? ""),
        sellingPrice,
        purchasePrice,
        mrp,
        supplier: String(values.get("supplier") ?? "") || undefined,
        openingBatchNumber: String(values.get("batchNumber") ?? "").trim() || undefined,
        reorderLevel,
        stock,
        prescriptionRequired: rxRequired,
        description: String(values.get("description") ?? "").trim(),
        expiry,
        status,
        sku: String(values.get("sku") ?? "").trim(),
        image: image || undefined,
        productType: productType || undefined,
        packUnits: cleanPacks.length ? cleanPacks : undefined,
        allowLoose,
        allowWholesale,
      });
      toast({ type: "success", title: "Medicine created", description: "The medicine is now available to managers in this pharmacy." });
      router.push("/admin/medicines");
    } catch (saveError) {
      toast({
        type: "danger",
        title: "Unable to save medicine",
        description: saveError instanceof Error ? saveError.message : "Please review the medicine details.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Medicine"
        description="Create a new medicine record in your catalog."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Medicines", href: "/admin/medicines" },
          { label: "Add Medicine" },
        ]}
      />

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Basic Information" subtitle="Core identity of the medicine" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input name="name" label="Medicine Name" placeholder="e.g. Panadol" required />
              <Input name="genericName" label="Generic Name" placeholder="e.g. Paracetamol" required />
              <FieldWithAdd label="Brand" onAdd={() => setQuickAdd("brands")}>
                <Select name="brand" placeholder="Select brand" value={brand} onChange={(e) => setBrand(e.target.value)} options={BRANDS.map((b) => ({ value: b.name, label: b.name }))} />
              </FieldWithAdd>
              <FieldWithAdd label="Category" onAdd={() => setQuickAdd("categories")}>
                <Select name="category" placeholder="Select category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES.map((c) => ({ value: c.name, label: c.name }))} />
              </FieldWithAdd>
              <FieldWithAdd label="Manufacturer" onAdd={() => setQuickAdd("manufacturers")}>
                <Select name="manufacturer" placeholder="Select manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} options={MANUFACTURERS.map((m) => ({ value: m.name, label: m.name }))} />
              </FieldWithAdd>
              <FieldWithAdd label="Supplier (optional)" onAdd={() => setQuickAdd("suppliers")}>
                <Select name="supplier" placeholder="Select supplier" hint="Where this stock is sourced from." value={supplier} onChange={(e) => setSupplier(e.target.value)} options={SUPPLIERS.map((s) => ({ value: s.name, label: s.name }))} />
              </FieldWithAdd>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Formulation" subtitle="Unit and strength" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-3">
                <Select name="unit" label="Unit" placeholder="Select unit" hint="The piece you stock & sell: Tablet, Capsule, Bottle, Tube, Vial…" options={UNITS.map((u) => ({ value: u, label: u }))} value={unit} onChange={(e) => setUnit(e.target.value)} />
                <Input name="strengthValue" label="Strength" placeholder="e.g. 500" inputMode="decimal" />
                <Select name="strengthUnit" label="Strength Unit" placeholder="mg / ml" hint="The dose unit (mg, ml) — not the packaging." options={STRENGTH_UNITS.map((u) => ({ value: u, label: u }))} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pricing & Stock" subtitle="Pricing and reorder configuration" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input name="sellingPrice" label={`Selling Price per ${unit || "base unit"} (Rs)`} type="number" placeholder="0" min={0} step="0.01" required value={sellingPriceStr} onChange={(e) => setSellingPriceStr(e.target.value)} hint={`Price for ONE ${unit || "base unit"} — not a strip or pack.`} />
              <Input name="mrp" label={`Printed MRP per ${unit || "base unit"} (Rs)`} type="number" placeholder="0" min={0} step="0.01" hint="Printed on the pack (reference only)." />
              <Input name="purchasePrice" label={`Purchase Price per ${unit || "base unit"} (Rs)`} type="number" placeholder="0" min={0} step="0.01" required hint="Your cost for one base unit." />
              <Input name="reorderLevel" label="Reorder Level" type="number" placeholder="e.g. 30" min={0} required />
              <Input name="stock" label="Opening Stock" type="number" placeholder="0" min={0} required />
              <Input name="batchNumber" label="Batch Number (optional)" placeholder="Auto if blank" />
              <Input name="expiry" label="Nearest Batch Expiry" type="date" required />
              <Input name="sku" label="SKU / Barcode" placeholder="e.g. PAN-500" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Packaging & Units" subtitle="Optional — sell in strips, boxes, or cartons with their own prices" />
            <CardBody>
              <PackagingEditor
                baseUnit={unit}
                basePrice={Number(sellingPriceStr) || 0}
                productType={productType}
                packUnits={packUnits}
                allowLoose={allowLoose}
                allowWholesale={allowWholesale}
                onProductType={setProductType}
                onPackUnits={setPackUnits}
                onAllowLoose={setAllowLoose}
                onAllowWholesale={setAllowWholesale}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Description" subtitle="Usage information & notes" />
            <CardBody>
              <Textarea name="description" rows={4} placeholder="Describe the medicine, its uses, and any important notes…" />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Product Image" subtitle="Shown in the manager store" />
            <CardBody>
              <ImageUpload value={image} onChange={setImage} folder="products" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Settings" />
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-navy-100 p-3">
                <div>
                  <p className="text-sm font-medium text-navy-800">Prescription Required</p>
                  <p className="text-xs text-navy-400">Requires a valid Rx to dispense</p>
                </div>
                <Toggle checked={rxRequired} onChange={setRxRequired} />
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-primary-50 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <Pill className="h-5 w-5" />
                </span>
                <p className="text-xs text-navy-600">
                  New medicines appear in the manager store immediately once created.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-2">
              <Button type="submit" loading={saving} className="w-full">
                <Save className="h-4 w-4" /> Save Medicine
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/admin/medicines")}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            </CardBody>
          </Card>
        </div>
      </form>

      <QuickAddEntityModal
        kind={quickAdd}
        open={!!quickAdd}
        onClose={() => setQuickAdd(null)}
        onCreated={onQuickCreated}
      />
    </div>
  );
}

/** A labelled field with a small "+ Add" action that opens a quick-add modal. */
function FieldWithAdd({ label, onAdd, children }: { label: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-navy-700">{label}</span>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 transition hover:text-primary-700">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      {children}
    </div>
  );
}
