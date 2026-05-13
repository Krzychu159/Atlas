"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  updateTrainerRates,
  type TrainerRate,
} from "@/app/lib/owner/settlements";
import {
  updateTrainer,
  type Trainer,
  type UpdateTrainerPayload,
} from "@/app/lib/owner/trainers";

type EditTrainerModalProps = {
  open: boolean;
  trainer: Trainer | null;
  rates: TrainerRate[];
  onClose: () => void;
  onSaved: (trainer: Trainer, rates: TrainerRate[]) => void;
};

function toLocationInput(values?: number[] | null) {
  return values?.length ? values.join(", ") : "";
}

function parseLocationIds(value: string) {
  const ids = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part) && part > 0);

  return ids.length ? ids : null;
}

export default function EditTrainerModal({
  open,
  trainer,
  rates,
  onClose,
  onSaved,
}: EditTrainerModalProps) {
  const activeRate = useMemo(
    () => rates.find((rate) => rate.isActive) ?? rates[0],
    [rates],
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [locationIds, setLocationIds] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!trainer || !open) return;

    setFirstName(trainer.firstName || "");
    setLastName(trainer.lastName || "");
    setPhone(trainer.phone || "");
    setAvatarUrl(trainer.avatarUrl || "");
    setBio(trainer.bio || "");
    setStatus(trainer.status || "active");
    setExperienceYears(String(trainer.experienceYears ?? 0));
    setLocationIds(toLocationInput(trainer.locationIds));
    setHourlyRate(String(activeRate?.rate ?? trainer.hourlyRate ?? 0));
  }, [activeRate, open, trainer]);

  if (!open || !trainer) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trainer) return;

    const payload: UpdateTrainerPayload = {
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      phone: phone.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      bio: bio.trim() || null,
      status: status.trim() || null,
      experienceYears: Number(experienceYears) || 0,
      locationIds: parseLocationIds(locationIds),
    };

    try {
      setIsSaving(true);
      const [updatedTrainer, updatedRates] = await Promise.all([
        updateTrainer(trainer.id, payload),
        updateTrainerRates(trainer.id, {
          hourlyRate: hourlyRate.trim() ? Number(hourlyRate) : null,
        }),
      ]);

      onSaved(updatedTrainer, updatedRates);
      toast.success("Dane trenera zostały zaktualizowane.", {
        id: "owner-trainer-edit-success",
      });
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się zaktualizować trenera.",
        { id: "owner-trainer-edit-error" },
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="max-h-full w-full max-w-[760px] overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 shadow-ambient md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">Edycja</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Dane trenera
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Imię" value={firstName} onChange={setFirstName} />
          <Field label="Nazwisko" value={lastName} onChange={setLastName} />
          <Field label="Telefon" value={phone} onChange={setPhone} />
          <Field
            label="Status"
            value={status}
            onChange={setStatus}
            placeholder="active"
          />
          <Field
            label="Doświadczenie"
            value={experienceYears}
            onChange={setExperienceYears}
            type="number"
          />
          <Field
            label="Stawka godzinowa"
            value={hourlyRate}
            onChange={setHourlyRate}
            type="number"
          />
          <Field
            label="URL avatara"
            value={avatarUrl}
            onChange={setAvatarUrl}
            className="md:col-span-2"
          />
          <Field
            label="ID lokalizacji"
            value={locationIds}
            onChange={setLocationIds}
            placeholder="np. 1, 2"
            className="md:col-span-2"
          />
          <TextArea
            label="Opis"
            value={bio}
            onChange={setBio}
            className="md:col-span-2"
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-[var(--radius-lg)] bg-surface-container-low px-6 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-12 rounded-[var(--radius-lg)] bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-container disabled:opacity-60"
          >
            {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
      />
    </label>
  );
}
