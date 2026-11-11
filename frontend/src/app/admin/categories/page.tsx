"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tags, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { SearchBar } from "@/components/tables/SearchBar";
import { EmptyState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";
import { CATEGORIES } from "@/lib/data";
import { usePharmacyData } from "@/lib/pharmacyData";
import { useToast } from "@/lib/toast";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const { toast } = useToast();
  const { saveRecord, deleteRecord } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CATEGORIES.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [search]);

  const closeAdd = () => {
    setAddOpen(false);
    setEditTarget(null);
    setName("");
    setDescription("");
  };

  const openEdit = (c: Category) => {
    setEditTarget(c);
    setName(c.name);
    setDescription(c.description);
    setAddOpen(true);
  };

  const saveCategory = async () => {
    const trimmed = name.trim();
    const duplicate = CATEGORIES.some(
      (c) => c.id !== editTarget?.id && c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast({ type: "warning", title: "Already exists", description: `A category named "${trimmed}" already exists.` });
      return;
    }
    try {
      await saveRecord("categories", {
        id: editTarget?.id ?? crypto.randomUUID(),
        name: trimmed,
        description: description.trim(),
        medicineCount: editTarget?.medicineCount ?? 0,
        color: editTarget?.color ?? "#6366f1",
      });
      toast({ type: "success", title: editTarget ? "Category updated" : "Category saved", description: `${trimmed} ${editTarget ? "updated" : "added to the catalog"}.` });
      closeAdd();
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save category", description: saveError instanceof Error ? saveError.message : "Please try again." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your medicine catalog into browsable categories."
        breadcrumbs={[
          { label: "Home", href: "/admin/dashboard" },
          { label: "Products" },
          { label: "Categories" },
        ]}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        }
      />

      <div className="mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search categories by name…"
          className="sm:max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Tags className="h-6 w-6" />}
              title="No categories found"
              description="Try adjusting your search."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="transition-shadow hover:shadow-card-hover"
            >
              <CardBody className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      <LayoutGrid className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900">{c.name}</p>
                      <Badge tone="navy" dot className="mt-1">
                        {c.medicineCount} medicines
                      </Badge>
                    </div>
                  </div>
                  <Dropdown
                    align="right"
                    trigger={
                      <button
                        className="rounded-lg px-2 py-1 text-navy-400 hover:bg-navy-100 hover:text-navy-700"
                        aria-label="Actions"
                      >
                        •••
                      </button>
                    }
                    items={[
                      {
                        label: "Edit",
                        icon: <Pencil className="h-4 w-4" />,
                        onClick: () => openEdit(c),
                      },
                      { label: "", divider: true },
                      {
                        label: "Delete",
                        icon: <Trash2 className="h-4 w-4" />,
                        danger: true,
                        onClick: () => setDeleteTarget(c),
                      },
                    ]}
                  />
                </div>

                <p className="mt-3 flex-1 text-sm text-navy-500">
                  {c.description}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-navy-100 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Add category modal */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title={editTarget ? "Edit Category" : "Add Category"}
        description={editTarget ? "Update this category's details." : "Create a new category to group your medicines."}
        footer={
          <>
            <Button variant="outline" onClick={closeAdd}>
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={!name.trim()}>{editTarget ? "Save Changes" : "Save Category"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category name"
            placeholder="e.g. Pain Relief"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Short description of this category"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete category"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteRecord("categories", deleteTarget.id);
                  toast({ type: "success", title: "Category deleted", description: `${deleteTarget.name} removed from the catalog.` });
                  setDeleteTarget(null);
                } catch (deleteError) {
                  toast({ type: "danger", title: "Unable to delete category", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <Trash2 className="h-5 w-5 shrink-0" />
          Medicines in this category will need to be reassigned.
        </div>
      </Modal>
    </div>
  );
}
