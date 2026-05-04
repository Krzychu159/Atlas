"use client";

import { useEffect, useState } from "react";
import { PackagePlus, X } from "lucide-react";
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
  durationDays: "",
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
      durationDays: Number(form.durationDays || 0),
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

      <div className="relative z-10 w-full max-w-[560px] rounded-[28px] bg-surface-container-high p-6 md:p-8 shadow-ambient max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface"
        >
          <X size={18} />
        </button>

        <div className="pr-10">
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-primary/20 flex items-center justify-center text-primary-light">
            <PackagePlus size={22} />
          </div>

          <p className="mt-5 text-[2rem] leading-none font-semibold tracking-tight">
            Dodaj Nowy Pakiet
          </p>

          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Zdefiniuj nową ofertę treningową dla klientów studia.
          </p>
        </div>

        <div className="mt-7">
          <label className="text-label text-on-surface-variant">
            Nazwa pakietu
          </label>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="np. 12 treningów 1:1"
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
          />
        </div>

        <div className="mt-5">
          <label className="text-label text-on-surface-variant">Opis</label>
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Krótki opis oferty..."
            rows={3}
            className="mt-2 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-4 outline-none placeholder:text-on-surface-muted resize-none"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-label text-on-surface-variant">Cena</label>
            <input
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              type="number"
              placeholder="1200"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>

          <div>
            <label className="text-label text-on-surface-variant">Waluta</label>
            <input
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value)}
              placeholder="PLN"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-label text-on-surface-variant">
              Limit sesji
            </label>
            <input
              value={form.sessionsLimit}
              onChange={(event) =>
                updateField("sessionsLimit", event.target.value)
              }
              type="number"
              placeholder="12"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>

          <div>
            <label className="text-label text-on-surface-variant">
              Czas trwania
            </label>
            <input
              value={form.durationDays}
              onChange={(event) =>
                updateField("durationDays", event.target.value)
              }
              type="number"
              placeholder="45"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateField("isActive", event.target.checked)}
            className="h-5 w-5 accent-blue-600"
          />
          <span className="text-sm text-on-surface-variant">
            Pakiet aktywny i widoczny w systemie
          </span>
        </label>

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !form.name ||
              !form.price ||
              !form.sessionsLimit ||
              !form.durationDays
            }
            className="h-16 rounded-[var(--radius-lg)] bg-primary-gradient text-white text-lg font-semibold disabled:opacity-60"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj Pakiet"}
          </button>

          <button
            onClick={onClose}
            className="h-14 rounded-[var(--radius-lg)] bg-surface-container text-on-surface-variant font-semibold"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}
