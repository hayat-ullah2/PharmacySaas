import { Pill, Boxes } from "lucide-react";

/**
 * Condensed explainer clarifying the two easily-confused fields on the
 * medicine form: Dosage Form (what the medicine is) vs Unit (how it is
 * stocked & sold). Mirrors the onboarding infographic.
 */
export function DosageVsUnitHint() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-3 text-xs sm:flex-row sm:items-stretch">
      <div className="flex flex-1 items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-primary-600 shadow-sm">
          <Pill className="h-4 w-4" />
        </span>
        <p className="text-navy-600">
          <span className="font-semibold text-navy-800">Dosage Form</span> — what the medicine <em>is</em>: its physical
          form (Tablet, Syrup, Cream, Injection…).
        </p>
      </div>
      <div className="hidden w-px self-stretch bg-primary-200 sm:block" />
      <div className="flex flex-1 items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-primary-600 shadow-sm">
          <Boxes className="h-4 w-4" />
        </span>
        <p className="text-navy-600">
          <span className="font-semibold text-navy-800">Unit</span> — how you <em>stock &amp; sell</em> it. Pick the
          smallest piece (e.g. Tablet); build <span className="font-medium text-navy-700">Box → Strip</span> in
          Packaging below.
        </p>
      </div>
    </div>
  );
}
