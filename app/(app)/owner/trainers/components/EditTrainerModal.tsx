"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";
import AvatarFilePicker from "../../components/AvatarFilePicker";
import {
  OwnerTextArea,
  OwnerTextField,
} from "../../components/OwnerFormControls";
import { showOwnerError, showOwnerSuccess } from "../../components/owner-toast";
import { CustomSelect } from "@/app/components/ui/custom-select";
import {
  deleteTrainerAvatar,
  uploadTrainerAvatar,
} from "@/app/lib/avatars";
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
  onAvatarChanged?: (avatarUrl: string) => void;
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
  onAvatarChanged,
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
  const [outlookCategory, setOutlookCategory] = useState("");
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

    void Promise.resolve().then(() => {
      setFirstName(trainer.firstName || "");
      setLastName(trainer.lastName || "");
      setPhone(trainer.phone || "");
      setAvatarUrl(trainer.avatarUrl || "");
      setBio(trainer.bio || "");
      setStatus(normalizeTrainerStatus(trainer.status));
      setExperienceYears(String(trainer.experienceYears ?? 0));
      setOutlookCategory(trainer.outlookCategoryName || "");
      setLocationIds(toLocationValues(trainer.locationIds));
      setHourlyRate(String(activeRate?.rate ?? trainer.hourlyRate ?? 0));
    });
  }, [activeRate, open, trainer]);

  if (!open || !trainer) return null;
  const trainerId = trainer.id;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trainer) return;

    const payload: UpdateTrainerPayload = {
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      status: status || null,
      experienceYears: Number(experienceYears) || 0,
      outlookCategoryName: outlookCategory.trim() || null,
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
      showOwnerSuccess("Dane trenera zostały zaktualizowane.", {
        id: "owner-trainer-edit-success",
      });
      onClose();
    } catch (err) {
      showOwnerError(err, "Nie udało się zaktualizować trenera.", {
        id: "owner-trainer-edit-error",
      });
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

  async function handleAvatarUpload(file: File) {
    const uploadedUrl = await uploadTrainerAvatar(trainerId, file);
    onAvatarChanged?.(uploadedUrl);
    showOwnerSuccess("Avatar trenera został zmieniony.", {
      id: "trainer-avatar-upload-success",
    });
    return uploadedUrl;
  }

  async function handleAvatarRemove() {
    await deleteTrainerAvatar(trainerId);
    onAvatarChanged?.("");
    showOwnerSuccess("Avatar trenera został usunięty.", {
      id: "trainer-avatar-delete-success",
    });
  }

  return (
    <ModalOverlay onClose={onClose} className="px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-full w-full max-w-[760px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader
            eyebrow="Edycja"
            title="Dane trenera"
            onClose={onClose}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <OwnerTextField
              label="Imię"
              value={firstName}
              onChange={setFirstName}
            />
            <OwnerTextField
              label="Nazwisko"
              value={lastName}
              onChange={setLastName}
            />
            <OwnerTextField label="Telefon" value={phone} onChange={setPhone} />
            <div>
              <span className="text-label text-on-surface-muted">Status</span>
              <CustomSelect
                value={status}
                onChange={setStatus}
                className="mt-2"
                options={statusOptions}
              />
            </div>
            {/* <OwnerTextField
            label="Doświadczenie"
            value={experienceYears}
            onChange={setExperienceYears}
            type="number"
          /> */}
            <OwnerTextField
              label="Kategoria Outlook"
              value={outlookCategory}
              onChange={setOutlookCategory}
            />
            <OwnerTextField
              label="Stawka godzinowa"
              value={hourlyRate}
              onChange={setHourlyRate}
              type="number"
            />
            <AvatarFilePicker
              label="Zdjęcie trenera"
              value={avatarUrl}
              onChange={setAvatarUrl}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
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
            <OwnerTextArea
              label="Opis"
              value={bio}
              onChange={setBio}
              className="md:col-span-2"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Anuluj
          </Button>
          <Button type="submit" disabled={isSaving} icon={<Save size={16} />}>
            {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
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
    <div
      ref={rootRef}
      className={["relative", className].filter(Boolean).join(" ")}
    >
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
