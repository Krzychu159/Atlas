"use client";

import { useEffect, useState } from "react";
import { Camera, Link as LinkIcon, X } from "lucide-react";
import type { CreateClientPayload } from "@/app/lib/owner/clients";

type AddClientModalProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateClientPayload) => Promise<void>;
};

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  avatarUrl: "",
  goal: "",
  notes: "",
  googleSheetUrl: "",
};

export default function AddClientModal({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: AddClientModalProps) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    await onSubmit({
      trainerId: 0,
      activePackageId: 0,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      avatarUrl: form.avatarUrl,
      goal: form.goal,
      notes: form.notes || form.googleSheetUrl,
      progressPercent: 0,
      billingStatus: "Oczekujący",
      status: "active",
      nextSessionAt: null,
      createdBy: 0,
      locationId: 0,
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
          <p className="text-[2rem] leading-none font-semibold tracking-tight">
            Dodaj Nowego Klienta
          </p>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Wprowadź dane klienta, aby rozpocząć współpracę.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-4">
          <div>
            <label className="text-label text-on-surface-variant">Imię</label>
            <input
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              placeholder="Jan"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>

          <div>
            <label className="text-label text-on-surface-variant">
              Nazwisko
            </label>
            <input
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              placeholder="Kowalski"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-label text-on-surface-variant">
            Adres e-mail
          </label>
          <input
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="jan.kowalski@example.com"
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-label text-on-surface-variant">
              Telefon
            </label>
            <input
              value={form.phoneNumber}
              onChange={(event) =>
                updateField("phoneNumber", event.target.value)
              }
              placeholder="+48 500 000 000"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>

          <div>
            <label className="text-label text-on-surface-variant">Cel</label>
            <input
              value={form.goal}
              onChange={(event) => updateField("goal", event.target.value)}
              placeholder="Redukcja"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-label text-on-surface-variant">
            Dodaj zdjęcie / URL avatara
          </label>
          <div className="mt-2 rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-5">
            <div className="flex items-center justify-center gap-3 text-on-surface-variant">
              <Camera size={22} />
              <input
                value={form.avatarUrl}
                onChange={(event) =>
                  updateField("avatarUrl", event.target.value)
                }
                placeholder="https://..."
                className="w-full bg-transparent outline-none placeholder:text-on-surface-muted"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label className="text-label text-on-surface-variant">
              Link do arkusza Google
            </label>
            <LinkIcon size={15} className="text-primary-light" />
          </div>

          <input
            value={form.googleSheetUrl}
            onChange={(event) =>
              updateField("googleSheetUrl", event.target.value)
            }
            placeholder="https://docs.google.com/spreadsheets/..."
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
          />
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.firstName || !form.lastName}
            className="h-16 rounded-[var(--radius-lg)] bg-primary-gradient text-white text-lg font-semibold disabled:opacity-60"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj Klienta"}
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
