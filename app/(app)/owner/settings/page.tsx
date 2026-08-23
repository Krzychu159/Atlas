"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CircleUserRound,
  Info,
  Lock,
  Save,
  Settings2,
  User,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import { getCurrentUser } from "@/app/lib/auth/current-user";
import {
  getOwnerSettings,
  updateOwnerSettings,
  type OwnerSettings,
} from "@/app/lib/owner/settings";
import OutlookIntegrationCard from "./components/OutlookIntegrationCard";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
};

type SystemForm = {
  defaultPackageValidityDays: string;
  defaultSessionDurationMinutes: string;
  defaultPaymentDueDays: string;
};

const emptyProfile: ProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
};

const emptySystem: SystemForm = {
  defaultPackageValidityDays: "",
  defaultSessionDurationMinutes: "",
  defaultPaymentDueDays: "",
};

export default function OwnerSettingsPage() {
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [system, setSystem] = useState<SystemForm>(emptySystem);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSystem, setIsSavingSystem] = useState(false);

  async function loadSettings() {
    try {
      setIsLoading(true);
      const [user, ownerSettings] = await Promise.all([
        getCurrentUser(),
        getOwnerSettings(),
      ]);
      const names = splitFullName(user.fullName);

      setProfile({
        firstName: names.firstName,
        lastName: names.lastName,
        email: user.email,
      });
      setSystem(toSystemForm(ownerSettings));
    } catch (err) {
      showAppError(err, "Nie udało się pobrać ustawień ownera.", {
        id: "owner-settings-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleSaveSystemSettings() {
    const parsed = parseSystemForm(system);

    if (!parsed) {
      showAppError(
        new Error("Wpisz poprawne, całkowite wartości ustawień systemowych."),
        "",
        { id: "owner-settings-invalid" },
      );
      return;
    }

    try {
      setIsSavingSystem(true);
      const saved = await updateOwnerSettings(parsed);
      setSystem(toSystemForm(saved));
      showAppSuccess("Ustawienia systemowe zostały zapisane.", {
        id: "owner-settings-save-success",
      });
    } catch (err) {
      showAppError(err, "Nie udało się zapisać ustawień systemowych.", {
        id: "owner-settings-save-error",
      });
    } finally {
      setIsSavingSystem(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <section>
        <p className="text-label text-primary-light">Ustawienia</p>
        <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
          Ustawienia <span className="text-primary-light">ATLAS</span>
        </h1>
        <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
          Zarządzaj profilem, wartościami domyślnymi systemu i integracją
          Outlook.
        </p>
      </section>

      <section className="card-shell p-5 md:p-6">
        <SectionTitle icon={<User size={18} />} title="Ustawienia profilu" />

        <div className="mt-6 grid gap-6 lg:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] bg-surface-container-low p-5 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[var(--radius-xl)] bg-primary/15 text-3xl font-semibold text-primary-light">
              {getInitials(profile.firstName, profile.lastName) || (
                <CircleUserRound size={38} />
              )}
            </div>
            <p className="mt-3 text-sm font-semibold text-on-surface">
              {`${profile.firstName} ${profile.lastName}`.trim() || "Owner"}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Imię"
              value={profile.firstName}
              onChange={(firstName) =>
                setProfile((current) => ({ ...current, firstName }))
              }
              disabled={isLoading}
            />
            <TextField
              label="Nazwisko"
              value={profile.lastName}
              onChange={(lastName) =>
                setProfile((current) => ({ ...current, lastName }))
              }
              disabled={isLoading}
            />
            <TextField
              label="E-mail"
              value={profile.email}
              onChange={() => undefined}
              disabled
              className="md:col-span-2"
            />
          </div>
        </div>

        <UnavailableProfileSave />
      </section>

      <section className="flex flex-col gap-4">
        <div className="card-shell p-5 md:p-6">
          <SectionTitle
            icon={<Settings2 size={18} />}
            title="Ustawienia systemowe"
          />
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-on-surface-variant">
            Wartości są używane automatycznie przy tworzeniu pakietów, płatności
            i sesji.
          </p>

          {isLoading ? (
            <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
              Ładowanie ustawień systemowych...
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <SystemNumberField
                label="Ważność pakietu"
                suffix="dni"
                description="Domyślny okres ważności nowego pakietu klienta."
                value={system.defaultPackageValidityDays}
                onChange={(value) =>
                  setSystem((current) => ({
                    ...current,
                    defaultPackageValidityDays: value,
                  }))
                }
              />
              <SystemNumberField
                label="Czas sesji"
                suffix="min"
                description="Domyślna długość sesji bez podanej godziny końca."
                value={system.defaultSessionDurationMinutes}
                onChange={(value) =>
                  setSystem((current) => ({
                    ...current,
                    defaultSessionDurationMinutes: value,
                  }))
                }
              />
              <SystemNumberField
                label="Termin płatności"
                suffix="dni"
                description="Domyślny termin płatności bez ręcznej daty."
                value={system.defaultPaymentDueDays}
                onChange={(value) =>
                  setSystem((current) => ({
                    ...current,
                    defaultPaymentDueDays: value,
                  }))
                }
                min={0}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              icon={<Save size={16} />}
              onClick={handleSaveSystemSettings}
              disabled={isLoading || isSavingSystem}
              className="w-full sm:w-auto"
            >
              {isSavingSystem ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>

        <OutlookIntegrationCard />
      </section>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
        {icon}
      </div>
      <p className="text-section-title">{title}</p>
    </div>
  );
}

function SystemNumberField({
  label,
  suffix,
  description,
  value,
  onChange,
  min = 1,
}: {
  label: string;
  suffix: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        type="number"
        min={min}
        step={1}
      />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary-light">
        {suffix}
      </p>
      <p className="mt-2 text-xs leading-5 text-on-surface-muted">
        {description}
      </p>
    </div>
  );
}

function UnavailableProfileSave() {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2 text-sm text-on-surface-variant">
        <Info size={17} className="mt-0.5 shrink-0 text-warning-light" />
        <p>Edycja profilu nie jest jeszcze dostępna.</p>
      </div>
      <Button icon={<Lock size={16} />} disabled className="w-full sm:w-auto">
        Zapisz zmiany w Profilu
      </Button>
    </div>
  );
}

function splitFullName(value: string) {
  const parts = value.trim().split(" ").filter(Boolean);

  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

function toSystemForm(settings: OwnerSettings): SystemForm {
  return {
    defaultPackageValidityDays: String(settings.defaultPackageValidityDays),
    defaultSessionDurationMinutes: String(
      settings.defaultSessionDurationMinutes,
    ),
    defaultPaymentDueDays: String(settings.defaultPaymentDueDays),
  };
}

function parseSystemForm(form: SystemForm): OwnerSettings | null {
  const defaultPackageValidityDays = Number(form.defaultPackageValidityDays);
  const defaultSessionDurationMinutes = Number(
    form.defaultSessionDurationMinutes,
  );
  const defaultPaymentDueDays = Number(form.defaultPaymentDueDays);

  if (
    !Number.isInteger(defaultPackageValidityDays) ||
    defaultPackageValidityDays < 1 ||
    !Number.isInteger(defaultSessionDurationMinutes) ||
    defaultSessionDurationMinutes < 1 ||
    !Number.isInteger(defaultPaymentDueDays) ||
    defaultPaymentDueDays < 0
  ) {
    return null;
  }

  return {
    defaultPackageValidityDays,
    defaultSessionDurationMinutes,
    defaultPaymentDueDays,
  };
}
