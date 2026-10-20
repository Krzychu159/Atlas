"use client";

import { CustomSelect } from "@/app/components/ui/custom-select";
import { OwnerTextField } from "../../components/OwnerFormControls";
import type { PackageForm } from "../package-form";

// SessionBillingType from the API: 1 = OneToOne, 2 = TwoToOne, 3 = ThreeToOne, 4 = FourToOne, 5 = Group.
export const individualBillingTypeOptions = [
  { value: "1", label: "Trening 1:1 — jeden klient" },
  { value: "2", label: "Trening 2:1 — dwóch klientów" },
  { value: "3", label: "Trening 3:1 — trzech klientów" },
  { value: "4", label: "Trening 4:1 — czterech klientów" },
];

export function billingTypeSelectOptions(value: string) {
  return individualBillingTypeOptions.some((option) => option.value === value)
    ? individualBillingTypeOptions
    : [...individualBillingTypeOptions, { value, label: value ? `Inny typ (${value})` : "Wybierz typ" }];
}

export default function PackagePublicationFields({ form, onChange }: {
  form: PackageForm;
  onChange: <K extends keyof PackageForm>(field: K, value: PackageForm[K]) => void;
}) {
  return <>
    <CustomSelect label="Typ pakietu" value={form.billingType === "5" ? "5" : "standard"}
      onChange={(value) => onChange("billingType", value === "5" ? "5" : "1")}
      options={[{ value: "standard", label: "Standardowy / indywidualny" }, { value: "5", label: "Grupowy" }]} />
    {form.billingType !== "5" ? <div>
      <CustomSelect label="Typ rozliczenia" value={form.billingType}
        onChange={(value) => onChange("billingType", value)}
        options={billingTypeSelectOptions(form.billingType)} />
      <p className="mt-1.5 text-xs leading-5 text-on-surface-variant">Liczba klientów trenujących jednocześnie z jednym trenerem.</p>
    </div> : <>
      <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
        <input type="checkbox" role="switch" checked={form.isPubliclyAvailable}
          onChange={(event) => onChange("isPubliclyAvailable", event.target.checked)} className="h-5 w-5 atlas-brand-checkbox" />
        <span className="text-sm text-on-surface-variant">Publicznie dostępny</span>
      </label>
      {form.isPubliclyAvailable ? <OwnerTextField label="Końcówka linku do pakietu" value={form.publicSlug}
        onChange={(value) => onChange("publicSlug", value)} placeholder="zajecia-grupowe-4-wejscia" /> : null}
    </>}
  </>;
}
