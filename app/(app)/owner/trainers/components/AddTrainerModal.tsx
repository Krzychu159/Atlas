"use client";

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import type { CreateTrainerPayload } from "@/app/lib/owner/trainers";

type AddTrainerModalProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTrainerPayload) => Promise<void>;
};

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  bio: "",
  avatarUrl: "",
  experienceYears: "",
  hourlyRate: "",
};

export default function AddTrainerModal({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: AddTrainerModalProps) {
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
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      bio: form.bio,
      phone: form.phone,
      avatarUrl: form.avatarUrl,
      status: "Active",
      experienceYears: Number(form.experienceYears || 0),
      hourlyRate: Number(form.hourlyRate || 0),
      createdBy: 0,
      locationIds: [],
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
            Dodaj Nowego Trenera
          </p>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Wprowadź dane trenera, aby dodać go do zespołu studia.
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
            placeholder="trainer@atlas-crm.com"
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
          />
        </div>

        <div className="mt-5">
          <label className="text-label text-on-surface-variant">
            Hasło startowe
          </label>
          <input
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            type="password"
            placeholder="••••••••"
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-label text-on-surface-variant">
              Telefon
            </label>
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+48 500 000 000"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>

          <div>
            <label className="text-label text-on-surface-variant">
              Doświadczenie (lata)
            </label>
            <input
              value={form.experienceYears}
              onChange={(event) =>
                updateField("experienceYears", event.target.value)
              }
              type="number"
              placeholder="6"
              className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-label text-on-surface-variant">
            Stawka godzinowa
          </label>
          <input
            value={form.hourlyRate}
            onChange={(event) => updateField("hourlyRate", event.target.value)}
            type="number"
            placeholder="150"
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none placeholder:text-on-surface-muted"
          />
        </div>

        <div className="mt-5">
          <label className="text-label text-on-surface-variant">
            Zdjęcie / URL avatara
          </label>
          <div className="mt-2 rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-5">
            <div className="flex items-center gap-3 text-on-surface-variant">
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
          <label className="text-label text-on-surface-variant">Bio</label>
          <textarea
            value={form.bio}
            onChange={(event) => updateField("bio", event.target.value)}
            placeholder="Specjalizacja, doświadczenie, styl pracy..."
            rows={3}
            className="mt-2 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-4 outline-none placeholder:text-on-surface-muted resize-none"
          />
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !form.firstName ||
              !form.lastName ||
              !form.email ||
              !form.password
            }
            className="h-16 rounded-[var(--radius-lg)] bg-primary-gradient text-white text-lg font-semibold disabled:opacity-60"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj Trenera"}
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
