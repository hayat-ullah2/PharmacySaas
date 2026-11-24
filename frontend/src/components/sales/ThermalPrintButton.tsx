"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { printThermalReceipt, thermalReceiptFromSale, type ReceiptWidth } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import type { Sale } from "@/lib/types";

/**
 * Reprint a stored sale on the thermal roll printer (58mm/80mm), a faithful
 * copy of the original receipt. Shares the paper-width preference with checkout
 * via localStorage. Pharmacy identity comes from the signed-in tenant profile.
 */
export function ThermalPrintButton({ sale, variant = "outline" }: { sale: Sale; variant?: "outline" | "ghost" | "secondary" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [width, setWidth] = useState<ReceiptWidth>(() => {
    if (typeof window === "undefined") return 80;
    return localStorage.getItem("medicare.receiptWidth") === "58" ? 58 : 80;
  });
  const choose = (w: ReceiptWidth) => {
    setWidth(w);
    try { localStorage.setItem("medicare.receiptWidth", String(w)); } catch { /* optional */ }
  };

  const print = () => {
    const ok = printThermalReceipt(
      thermalReceiptFromSale(sale, {
        name: user?.pharmacyName,
        logo: user?.pharmacyLogo,
        address: user?.pharmacyAddress,
        phone: user?.pharmacyPhone,
        license: user?.pharmacyLicense,
        taxId: user?.pharmacyTaxId,
      }),
      width,
    );
    if (!ok) toast({ type: "warning", title: "Pop-up blocked", description: "Allow pop-ups for this site to print the receipt." });
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="inline-flex rounded-lg border border-navy-200 bg-navy-50 p-0.5 text-xs">
        {([58, 80] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => choose(w)}
            className={cn(
              "rounded-md px-2 py-1 font-medium transition",
              width === w ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-700",
            )}
          >
            {w}mm
          </button>
        ))}
      </div>
      <Button variant={variant} onClick={print}>
        <Printer className="h-4 w-4" /> Print thermal
      </Button>
    </div>
  );
}
