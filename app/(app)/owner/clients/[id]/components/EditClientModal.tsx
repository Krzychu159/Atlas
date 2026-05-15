"use client";

import { type FormEvent, useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { CustomSelect } from "@/app/components/ui/custom-select";
import AvatarFilePicker from "../../../components/AvatarFilePicker";
import {
  getClient,
  updateClient,
  type Client,
  type UpdateClientPayload,
} from "@/app/lib/owner/clients";
import { getLocations, type Location } from "@/app/lib/owner/locations";
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
  const [locations, setLocations] = useState<Location[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [goal, setGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    Promise.all([getTrainers(), getLocations()])
      .then(([trainersData, locationsData]) => {
        setTrainers(trainersData);
        setLocations(locationsData);
      })
      .catch(() => {
        setTrainers([]);
        setLocations([]);
      });
  }, [open]);

  useEffect(() => {
    if (!client || !open) return;

    setFirstName(client.firstName || "");
    setLastName(client.lastName || "");
    setEmail(client.email || "");
    setPhoneNumber(client.phoneNumber || "");
    setAvatarUrl(client.avatarUrl || "");
    setTrainerId(client.trainerId ? String(client.trainerId) : "");
    setLocationId(resolveClientLocationId(client, locations));
    setGoal(client.goal || "");
  }, [client, locations, open]);

  if (!open || !client) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client) return;

    const resolvedLocationId = Number(locationId);

    if (!resolvedLocationId) {
      toast.error("Wybierz lokalizację klienta.", {
        id: "owner-client-location-required",
      });
      return;
    }

    const payload: UpdateClientPayload = {
      trainerId: trainerId ? Number(trainerId) : null,
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      goal: goal.trim() || null,
      locationId: resolvedLocationId,
      progressPercent: client.progressPercent ?? 0,
      billingStatus: client.billingStatus || null,
      status: client.status || null,
      nextSessionAt: client.nextSessionAt || null,
    };

    try {
      setIsSaving(true);
      await updateClient(client.id, payload);
      const confirmedClient = await getClient(client.id);
      const failedFields = getClientUpdateFailedFields(confirmedClient, payload);

      if (failedFields.length) {
        throw new Error(
          `Backend zwrócił sukces, ale nie zapisał pól: ${failedFields.join(", ")}.`,
        );
      }

      onSaved(confirmedClient);
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

  const trainerOptions = [
    { value: "", label: "Brak przypisania" },
    ...trainers.map((trainer) => ({
      value: String(trainer.id),
      label: trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
    })),
  ];
  const locationOptions = locations.length
    ? locations.map((location) => ({
        value: String(location.id),
        label: formatLocationLabel(location),
      }))
    : [
        {
          value: locationId,
          label: client.locationName || "Brak lokalizacji",
        },
      ];
  const avatarFallback = `${firstName[0] || ""}${lastName[0] || ""}` || "K";

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
          <AvatarFilePicker
            label="Zdjęcie klienta"
            value={avatarUrl}
            onChange={setAvatarUrl}
            fallbackText={avatarFallback}
            className="md:col-span-2"
          />

          <div>
            <span className="text-label text-on-surface-muted">Trener</span>
            <CustomSelect
              value={trainerId}
              onChange={setTrainerId}
              className="mt-2"
              options={trainerOptions}
            />
          </div>

          <div>
            <span className="text-label text-on-surface-muted">
              Lokalizacja
            </span>
            <CustomSelect
              value={locationId}
              onChange={setLocationId}
              icon={<MapPin size={16} />}
              className="mt-2"
              options={locationOptions}
            />
          </div>

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

function formatLocationLabel(location: Location) {
  return location.name || location.city || `Lokalizacja ${location.id}`;
}

function normalizeLocationName(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function resolveClientLocationId(client: Client, locations: Location[]) {
  if (client.locationId) return String(client.locationId);

  const clientLocationName = normalizeLocationName(client.locationName);
  const matchedLocation = locations.find((location) =>
    [location.name, location.city]
      .map(normalizeLocationName)
      .filter(Boolean)
      .includes(clientLocationName),
  );

  return matchedLocation ? String(matchedLocation.id) : "";
}

function normalizeText(value?: string | null) {
  return (value || "").trim();
}

function isSameOptionalText(
  actual?: string | null,
  expected?: string | null,
) {
  return normalizeText(actual) === normalizeText(expected);
}

function getClientUpdateFailedFields(
  client: Client,
  payload: UpdateClientPayload,
) {
  const failedFields: string[] = [];

  if (client.trainerId !== payload.trainerId) failedFields.push("trener");
  if (client.locationId !== payload.locationId) failedFields.push("lokalizacja");
  if (!isSameOptionalText(client.firstName, payload.firstName)) {
    failedFields.push("imię");
  }
  if (!isSameOptionalText(client.lastName, payload.lastName)) {
    failedFields.push("nazwisko");
  }
  if (!isSameOptionalText(client.email, payload.email)) {
    failedFields.push("e-mail");
  }
  if (!isSameOptionalText(client.phoneNumber, payload.phoneNumber)) {
    failedFields.push("telefon");
  }
  if (!isSameOptionalText(client.avatarUrl, payload.avatarUrl)) {
    failedFields.push("zdjęcie");
  }
  if (!isSameOptionalText(client.goal, payload.goal)) failedFields.push("cel");

  return failedFields;
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
