"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin, PackagePlus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import {
  OwnerTextArea,
  OwnerTextField,
} from "../../components/OwnerFormControls";
import type { CreatePackagePayload } from "@/app/lib/owner/packages";
import type { Location } from "@/app/lib/owner/locations";
import { packageBillingModeOptions, type PackageBillingMode } from "@/app/lib/period-packages";

import { createPackageForm, changePackageField, packageFormPayload, type PackageForm } from "../package-form";
import PackagePublicationFields from "./PackagePublicationFields";
import { showOwnerError } from "../../components/owner-toast";

type AddPackageModalProps = {
  open: boolean;
  isSubmitting: boolean;
  locations: Location[];
  defaultLocationId: number | null;
  onClose: () => void;
  onSubmit: (payload: CreatePackagePayload) => Promise<boolean>;
};

export default function AddPackageModal({
  open,
  isSubmitting,
  locations,
  defaultLocationId,
  onClose,
  onSubmit,
}: AddPackageModalProps) {
  const [form, setForm] = useState(() => createPackageForm(undefined, defaultLocationId));
  const saving = useRef(false);

  const locationOptions = useMemo(() => {
    const options = [
      { value: "", label: "Bez przypisania" },
      ...locations.map((location) => ({
        value: String(location.id),
        label: location.name || location.city || `Lokalizacja ${location.id}`,
      })),
    ];
    const defaultValue = defaultLocationId ? String(defaultLocationId) : "";

    if (
      defaultValue &&
      !options.some((option) => option.value === defaultValue)
    ) {
      options.push({
        value: defaultValue,
        label: `Lokalizacja ${defaultLocationId}`,
      });
    }

    return options;
  }, [defaultLocationId, locations]);

  if (!open) return null;

  function updateField<K extends keyof PackageForm>(field: K, value: PackageForm[K]) {
    setForm((current) => changePackageField(current, field, value));
  }

  const handleSubmit = async () => {
    if (saving.current || isSubmitting) return;
    let payload: CreatePackagePayload;
    try {
      payload = { ...packageFormPayload(form), ...(form.billingMode === "SessionBased" ? { createdBy: 0 } : {}) };
    } catch (error) {
      showOwnerError(error, "Sprawdź dane pakietu.");
      return;
    }
    saving.current = true;
    try { if (await onSubmit(payload)) setForm(createPackageForm(undefined, defaultLocationId)); }
    finally { saving.current = false; }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-high shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader
            title={form.billingMode === "PeriodBased" ? "Dodaj ofertę usługi" : "Dodaj pakiet"}
            description="Uzupełnij warunki pakietu treningowego lub usługi okresowej."
            icon={<PackagePlus size={22} />}
            onClose={onClose}
          />

          <fieldset disabled={isSubmitting} className="mt-6 grid gap-4 md:grid-cols-2">
          <CustomSelect className="md:col-span-2" label="Sposób rozliczenia" value={form.billingMode} options={packageBillingModeOptions} onChange={value => updateField("billingMode", value as PackageBillingMode)} />
          <OwnerTextField
            label={form.billingMode === "PeriodBased" ? "Nazwa usługi" : "Nazwa pakietu"}
            value={form.name}
            onChange={(value) => updateField("name", value)}
            placeholder={form.billingMode === "PeriodBased" ? "np. Prowadzenie dietetyczne — 30 dni" : "np. 12 treningów 1:1"}
          />
          <OwnerTextField
            label="Cena"
            value={form.price}
            onChange={(value) => updateField("price", value)}
            type="number"
            min={form.billingMode === "PeriodBased" ? 0 : undefined}
            step="0.01"
            placeholder="1200"
          />
          {form.billingMode === "SessionBased" ? <OwnerTextField
            label={form.billingType === "5" ? "Liczba wejść" : "Limit sesji"}
            value={form.sessionsLimit}
            onChange={(value) => updateField("sessionsLimit", value)}
            type="number"
            placeholder="12"
          /> : null}
          <OwnerTextField
            label={form.billingMode === "PeriodBased" ? "Czas trwania w dniach (1–3660)" : "Ważność w dniach"}
            value={form.durationDays}
            onChange={(value) => updateField("durationDays", value)}
            type="number"
            min={form.billingMode === "PeriodBased" ? 1 : undefined}
            max={form.billingMode === "PeriodBased" ? 3660 : undefined}
            step="1"
            placeholder="45"
          />
          {form.billingMode === "SessionBased" ? <OwnerTextField
            label="Uczestnicy"
            value={form.participantsCount}
            onChange={(value) => updateField("participantsCount", value)}
            type="number"
            placeholder="1"
          /> : null}
          {form.billingMode === "SessionBased" ? <OwnerTextField
            label="Sesje / tydzień"
            value={form.sessionsPerWeek}
            onChange={(value) => updateField("sessionsPerWeek", value)}
            type="number"
          /> : null}
          <OwnerTextField
            label="Waluta"
            value={form.currency}
            onChange={(value) => updateField("currency", value)}
          />
          {form.billingMode === "SessionBased" ? <PackagePublicationFields form={form} onChange={updateField} /> : null}
          <label>
            <span className="text-label text-on-surface-muted">
              Lokalizacja
            </span>
            <CustomSelect
              value={form.locationId}
              onChange={(value) => updateField("locationId", value)}
              options={locationOptions}
              icon={<MapPin size={16} />}
              className="mt-2"
            />
          </label>
          <OwnerTextArea
            label="Opis"
            value={form.description}
            onChange={(value) => updateField("description", value)}
            placeholder="Krótki opis oferty..."
            rows={2}
            className="md:col-span-2"
          />
          </fieldset>
        </div>

        <ModalFooter className="justify-between bg-surface-container-high sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              disabled={isSubmitting}
              checked={form.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              className="h-5 w-5 atlas-brand-checkbox"
            />
            <span className="text-sm text-on-surface-variant">
              {form.billingMode === "PeriodBased" ? "Oferta aktywna" : "Pakiet aktywny"}
            </span>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !form.name ||
              !form.price ||
              (form.billingMode === "SessionBased" && !form.sessionsLimit) ||
              !form.durationDays
            }
            size="lg"
          >
            {isSubmitting ? "Dodawanie..." : form.billingMode === "PeriodBased" ? "Dodaj ofertę usługi" : "Dodaj pakiet"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
