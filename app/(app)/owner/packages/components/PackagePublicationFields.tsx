"use client";

import { CustomSelect } from "@/app/components/ui/custom-select";
import { OwnerTextField } from "../../components/OwnerFormControls";
import type { PackageForm } from "../package-form";

export default function PackagePublicationFields({ form, onChange }: {
  form: PackageForm;
  onChange: <K extends keyof PackageForm>(field: K, value: PackageForm[K]) => void;
}) {
  return <>
    <label>
      <span className="text-label text-on-surface-muted">Typ pakietu</span>
      <CustomSelect className="mt-2" value={form.billingType === "5" ? "5" : "standard"}
        onChange={(value) => onChange("billingType", value === "5" ? "5" : "1")}
        options={[{ value: "standard", label: "Standardowy / indywidualny" }, { value: "5", label: "Grupowy" }]} />
    </label>
    {form.billingType !== "5" ? <OwnerTextField label="Typ rozliczenia" type="number"
      value={form.billingType} onChange={(value) => onChange("billingType", value)} /> : <>
      <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
        <input type="checkbox" role="switch" checked={form.isPubliclyAvailable}
          onChange={(event) => onChange("isPubliclyAvailable", event.target.checked)} className="h-5 w-5 accent-blue-600" />
        <span className="text-sm text-on-surface-variant">Publicznie dostępny</span>
      </label>
      {form.isPubliclyAvailable ? <OwnerTextField label="Publiczny slug" value={form.publicSlug}
        onChange={(value) => onChange("publicSlug", value)} placeholder="zajecia-grupowe-4-wejscia" /> : null}
    </>}
  </>;
}
