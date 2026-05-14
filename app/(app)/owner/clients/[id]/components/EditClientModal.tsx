"use client";

import { type FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  updateClient,
  type Client,
  type UpdateClientPayload,
} from "@/app/lib/owner/clients";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";

type EditClientModalProps = {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
};

export default function EditClientModal({
  open,
  client,
  onClose,
  onSaved,
}: EditClientModalProps) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [billingStatus, setBillingStatus] = useState("");
  const [progressPercent, setProgressPercent] = useState("0");
  const [goal, setGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    getTrainers()
      .then(setTrainers)
      .catch(() => setTrainers([]));
  }, [open]);

  useEffect(() => {
    if (!client || !open) return;

    setFirstName(client.firstName || "");
    setLastName(client.lastName || "");
    setEmail(client.email || "");
    setPhoneNumber(client.phoneNumber || "");
    setTrainerId(client.trainerId ? String(client.trainerId) : "");
    setBillingStatus(client.billingStatus || "");
    setProgressPercent(String(client.progressPercent ?? 0));
    setGoal(client.goal || "");
  }, [client, open]);

  if (!open || !client) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client) return;

    const payload: UpdateClientPayload = {
      trainerId: trainerId ? Number(trainerId) : null,
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
      goal: goal.trim() || null,
      progressPercent: Number(progressPercent) || 0,
      billingStatus: billingStatus.trim() || null,
    };

    try {
      setIsSaving(true);
      const updatedClient = await updateClient(client.id, payload);
      onSaved(updatedClient);
      toast.success("Dane klienta zostały zaktualizowane.", {
        id: "owner-client-edit-success",
      });
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się zaktualizować klienta.",
        { id: "owner-client-edit-error" },
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="max-h-full w-full max-w-[820px] overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 shadow-ambient md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">Edycja</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Dane klienta
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
          <Field label="E-mail" value={email} onChange={setEmail} />
          <Field
            label="Telefon"
            value={phoneNumber}
            onChange={setPhoneNumber}
          />
          <label>
            <span className="text-label text-on-surface-muted">Trener</span>
            <select
              value={trainerId}
              onChange={(event) => setTrainerId(event.target.value)}
              className="mt-2 h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none"
            >
              <option value="">Brak przypisania</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.fullName ||
                    `${trainer.firstName} ${trainer.lastName}`}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3">
            <p className="text-label text-on-surface-muted">Lokalizacja</p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              {client.locationName || "Brak lokalizacji"}
            </p>
          </div>
          <Field
            label="Status rozliczeń"
            value={billingStatus}
            onChange={setBillingStatus}
          />
          <Field
            label="Postęp"
            value={progressPercent}
            onChange={setProgressPercent}
            type="number"
          />
          <TextArea
            label="Cel"
            value={goal}
            onChange={setGoal}
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
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
