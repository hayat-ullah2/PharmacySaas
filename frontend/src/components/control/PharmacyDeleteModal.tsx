"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getAccessToken } from "@/lib/supabase";
import { useToast } from "@/lib/toast";

/**
 * Permanently delete a pharmacy. Requires the super admin to re-type the
 * pharmacy name — this removes the owner, every manager, and ALL records.
 */
export function PharmacyDeleteModal({
  pharmacy,
  onClose,
  onDeleted,
}: {
  pharmacy: { id: string; name: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim() === pharmacy.name.trim();

  const remove = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/control/delete-pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pharmacyId: pharmacy.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not delete the pharmacy.");
      if (payload.warning) toast({ type: "warning", title: "Deleted with a warning", description: payload.warning });
      else toast({ type: "success", title: "Pharmacy deleted", description: `${pharmacy.name} and all its data were removed.` });
      onDeleted();
      onClose();
    } catch (deleteError) {
      toast({ type: "danger", title: "Unable to delete pharmacy", description: deleteError instanceof Error ? deleteError.message : "Please try again." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => { if (!deleting) onClose(); }}
      title="Delete pharmacy"
      description="This cannot be undone."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={remove} loading={deleting} disabled={!canDelete}>
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            This permanently removes <span className="font-semibold">{pharmacy.name}</span>, its owner login,
            every manager account, and all of its medicines, sales, and records. There is no recovery.
          </div>
        </div>
        <Input
          label={`Type "${pharmacy.name}" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          placeholder={pharmacy.name}
        />
      </div>
    </Modal>
  );
}
