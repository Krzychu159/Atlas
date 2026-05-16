"use client";

import { useEffect, useState } from "react";
import { PackagePlus, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  OwnerTextArea,
  OwnerTextField,
} from "../../components/OwnerFormControls";
import type { CreatePackagePayload } from "@/app/lib/owner/packages";

type AddPackageModalProps = {
  open: boolean;
  isSubmitting: boolean;
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
  isActive: true,
};

export default function AddPackageModal({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: AddPackageModalProps) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
      isActive: form.isActive,
      createdBy: 0,
    });

    setForm(initialForm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Zamknij"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
      />

      <div className="relative z-10 w-full max-w-[760px] rounded-[28px] bg-surface-container-high p-5 shadow-ambient md:p-6">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 pr-12">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/20 text-primary-light">
            <PackagePlus size={22} />
          </div>
          <div>
            <p className="font-display text-[2rem] font-semibold leading-none tracking-tight">
              Dodaj pakiet
            </p>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Uzupełnij ofertę treningową bez przewijania formularza.
            </p>
          </div>
        </div>

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
          <OwnerTextArea
            label="Opis"
            value={form.description}
            onChange={(value) => updateField("description", value)}
            placeholder="Krótki opis oferty..."
            rows={2}
            className="md:col-span-2"
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
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
        </div>
      </div>
    </div>
  );
}
