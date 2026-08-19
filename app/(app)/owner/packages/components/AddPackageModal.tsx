"use client";

import { useMemo, useState } from "react";
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

type AddPackageModalProps = {
  open: boolean;
  isSubmitting: boolean;
  locations: Location[];
  defaultLocationId: number | null;
  onClose: () => void;
  onSubmit: (payload: CreatePackagePayload) => Promise<void>;
};

const initialForm = {
  name: "",
  description: "",
  price: "",
  currency: "PLN",
  sessionsLimit: "",
  sessionsPerWeek: "1",
  durationDays: "",
  participantsCount: "1",
  billingType: "1",
  locationId: "",
  isActive: true,
};

function createInitialForm(defaultLocationId: number | null) {
  return {
    ...initialForm,
    locationId: defaultLocationId ? String(defaultLocationId) : "",
  };
}

export default function AddPackageModal({
  open,
  isSubmitting,
  locations,
  defaultLocationId,
  onClose,
  onSubmit,
}: AddPackageModalProps) {
  const [form, setForm] = useState(() => createInitialForm(defaultLocationId));

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

  const updateField = (
    field: keyof typeof initialForm,
    value: string | boolean,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    await onSubmit({
      name: form.name,
      description: form.description,
      price: Number(form.price || 0),
      currency: form.currency || "PLN",
      sessionsLimit: Number(form.sessionsLimit || 0),
      sessionsPerWeek: Number(form.sessionsPerWeek || 0),
      durationDays: Number(form.durationDays || 0),
      billingType: Number(form.billingType || 1),
      participantsCount: Number(form.participantsCount || 1),
      locationId: form.locationId ? Number(form.locationId) : null,
      isActive: form.isActive,
      createdBy: 0,
    });

    setForm(createInitialForm(defaultLocationId));
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-high shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader
            title="Dodaj pakiet"
            description="Uzupełnij podstawowe parametry oferty treningowej."
            icon={<PackagePlus size={22} />}
            onClose={onClose}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
          <OwnerTextField
            label="Nazwa pakietu"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            placeholder="np. 12 treningów 1:1"
          />
          <OwnerTextField
            label="Cena"
            value={form.price}
            onChange={(value) => updateField("price", value)}
            type="number"
            placeholder="1200"
          />
          <OwnerTextField
            label="Limit sesji"
            value={form.sessionsLimit}
            onChange={(value) => updateField("sessionsLimit", value)}
            type="number"
            placeholder="12"
          />
          <OwnerTextField
            label="Czas trwania"
            value={form.durationDays}
            onChange={(value) => updateField("durationDays", value)}
            type="number"
            placeholder="45"
          />
          <OwnerTextField
            label="Uczestnicy"
            value={form.participantsCount}
            onChange={(value) => updateField("participantsCount", value)}
            type="number"
            placeholder="1"
          />
          <OwnerTextField
            label="Sesje / tydzień"
            value={form.sessionsPerWeek}
            onChange={(value) => updateField("sessionsPerWeek", value)}
            type="number"
          />
          <OwnerTextField
            label="Waluta"
            value={form.currency}
            onChange={(value) => updateField("currency", value)}
          />
          <OwnerTextField
            label="Typ rozliczenia"
            value={form.billingType}
            onChange={(value) => updateField("billingType", value)}
            type="number"
          />
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
          </div>
        </div>

        <ModalFooter className="justify-between bg-surface-container-high sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              className="h-5 w-5 accent-blue-600"
            />
            <span className="text-sm text-on-surface-variant">
              Pakiet aktywny
            </span>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !form.name ||
              !form.price ||
              !form.sessionsLimit ||
              !form.durationDays
            }
            size="lg"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj pakiet"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
