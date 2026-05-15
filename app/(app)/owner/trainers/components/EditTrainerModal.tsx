"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import AvatarFilePicker from "../../components/AvatarFilePicker";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { getLocations, type Location } from "@/app/lib/owner/locations";
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

const trainerStatusOptions = [
  { value: "Active", label: "Aktywny" },
  { value: "Inactive", label: "Nieaktywny" },
  { value: "Paused", label: "Wstrzymany" },
];

function toLocationValues(values?: number[] | null) {
  return values?.map((value) => String(value)) ?? [];
}

function parseLocationIds(values: string[]) {
  const ids = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  return ids.length ? ids : null;
}

function normalizeTrainerStatus(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized === "active") return "Active";
  if (normalized === "inactive") return "Inactive";
  if (normalized === "paused") return "Paused";

  return value || "Active";
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
  const [locations, setLocations] = useState<Location[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    getLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, [open]);

  useEffect(() => {
    if (!trainer || !open) return;

    setFirstName(trainer.firstName || "");
    setLastName(trainer.lastName || "");
    setPhone(trainer.phone || "");
    setAvatarUrl(trainer.avatarUrl || "");
    setBio(trainer.bio || "");
    setStatus(normalizeTrainerStatus(trainer.status));
    setExperienceYears(String(trainer.experienceYears ?? 0));
    setLocationIds(toLocationValues(trainer.locationIds));
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
      status: status || null,
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

  const statusOptions = trainerStatusOptions.some(
    (option) => option.value === status,
  )
    ? trainerStatusOptions
    : [{ value: status, label: status }, ...trainerStatusOptions];
  const avatarFallback =
    `${firstName[0] || ""}${lastName[0] || ""}` || trainer.fullName || "T";

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
          <div>
            <span className="text-label text-on-surface-muted">Status</span>
            <CustomSelect
              value={status}
              onChange={setStatus}
              className="mt-2"
              options={statusOptions}
            />
          </div>
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
          <AvatarFilePicker
            label="Zdjęcie trenera"
            value={avatarUrl}
            onChange={setAvatarUrl}
            fallbackText={avatarFallback}
            className="md:col-span-2"
          />
          <LocationMultiSelect
            label="Lokalizacje"
            values={locationIds}
            locations={locations}
            fallbackNames={trainer.locationNames}
            onChange={setLocationIds}
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

function LocationMultiSelect({
  label,
  values,
  locations,
  fallbackNames,
  onChange,
  className,
}: {
  label: string;
  values: string[];
  locations: Location[];
  fallbackNames?: string[] | null;
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const baseOptions = locations.map((location) => ({
    value: String(location.id),
    label: formatLocationLabel(location),
  }));
  const missingOptions = values
    .filter((value) => !baseOptions.some((option) => option.value === value))
    .map((value, index) => ({
      value,
      label: fallbackNames?.[index] || `Lokalizacja ${value}`,
    }));
  const options = [...baseOptions, ...missingOptions];
  const selectedLabels = values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean) as string[];
  const displayValue = selectedLabels.length
    ? selectedLabels.length > 2
      ? `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`
      : selectedLabels.join(", ")
    : "Wybierz lokalizacje";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function toggleValue(value: string) {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }

  return (
    <div ref={rootRef} className={["relative", className].filter(Boolean).join(" ")}>
      <span className="text-label text-on-surface-muted">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "mt-2 flex h-12 w-full items-center gap-3 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-3 text-left transition",
          "hover:border-white/10 hover:bg-surface-container-low focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_24%,transparent)]",
          isOpen ? "border-primary-light/40 bg-surface-container-low" : "",
        ].join(" ")}
      >
        <MapPin size={16} className="shrink-0 text-on-surface-muted" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">
          {displayValue}
        </span>
        <ChevronDown
          size={16}
          className={[
            "shrink-0 text-on-surface-muted transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 max-h-72 w-full overflow-y-auto rounded-[var(--radius-lg)] border border-white/10 bg-surface-container p-1.5 shadow-ambient">
          {options.length ? (
            options.map((option) => {
              const active = values.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className={[
                    "flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-md)] px-3 text-left text-sm transition",
                    active
                      ? "bg-surface-container-high text-on-surface"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      active
                        ? "border-primary-light bg-primary text-on-primary"
                        : "border-white/15 bg-surface-container-lowest",
                    ].join(" ")}
                  >
                    {active ? <Check size={13} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {option.label}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-on-surface-muted">
              Brak lokalizacji do wyboru.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatLocationLabel(location: Location) {
  return location.name || location.city || `Lokalizacja ${location.id}`;
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
