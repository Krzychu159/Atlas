"use client";

import { useEffect, useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import {
  getOwnerSettings,
  updateOwnerSettings,
  type OwnerSettings,
} from "@/app/lib/owner/settings";
import SettingsSectionHeader from "./SettingsSectionHeader";

type SystemForm = {
  defaultPackageValidityDays: string;
  defaultSessionDurationMinutes: string;
  defaultPaymentDueDays: string;
};

const emptySystem: SystemForm = {
  defaultPackageValidityDays: "",
  defaultSessionDurationMinutes: "",
  defaultPaymentDueDays: "",
};

// Sekcja: Ustawienia systemowe
export default function SystemSettingsSection() {
  const [system, setSystem] = useState<SystemForm>(emptySystem);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setSystem(toSystemForm(await getOwnerSettings()));
      } catch (error) {
        showAppError(error, "Nie udało się pobrać ustawień ownera.", {
          id: "owner-settings-load-error",
        });
      } finally {
        setIsLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleSave() {
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
      setIsSaving(true);
      setSystem(toSystemForm(await updateOwnerSettings(parsed)));
      showAppSuccess("Ustawienia systemowe zostały zapisane.", {
        id: "owner-settings-save-success",
      });
    } catch (error) {
      showAppError(error, "Nie udało się zapisać ustawień systemowych.", {
        id: "owner-settings-save-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card-shell p-5 md:p-6">
      <SettingsSectionHeader
        icon={<Settings2 size={18} />}
        title="Ustawienia systemowe"
        description="Wartości używane automatycznie przy tworzeniu pakietów, płatności i sesji."
      />

      {isLoading ? (
        <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-sm text-on-surface-variant">
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
              setSystem((current) => ({ ...current, defaultPackageValidityDays: value }))
            }
          />
          <SystemNumberField
            label="Czas sesji"
            suffix="min"
            description="Domyślna długość sesji bez podanej godziny końca."
            value={system.defaultSessionDurationMinutes}
            onChange={(value) =>
              setSystem((current) => ({ ...current, defaultSessionDurationMinutes: value }))
            }
          />
          <SystemNumberField
            label="Termin płatności"
            suffix="dni"
            description="Domyślny termin płatności bez ręcznej daty."
            value={system.defaultPaymentDueDays}
            onChange={(value) =>
              setSystem((current) => ({ ...current, defaultPaymentDueDays: value }))
            }
            min={0}
          />
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          icon={<Save size={16} />}
          onClick={() => void handleSave()}
          disabled={isLoading || isSaving}
          className="w-full sm:w-auto"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz ustawienia"}
        </Button>
      </div>
    </section>
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
      <TextField label={label} value={value} onChange={onChange} type="number" min={min} step={1} />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary-light">
        {suffix}
      </p>
      <p className="mt-2 text-xs leading-5 text-on-surface-muted">{description}</p>
    </div>
  );
}

function toSystemForm(settings: OwnerSettings): SystemForm {
  return {
    defaultPackageValidityDays: String(settings.defaultPackageValidityDays),
    defaultSessionDurationMinutes: String(settings.defaultSessionDurationMinutes),
    defaultPaymentDueDays: String(settings.defaultPaymentDueDays),
  };
}

function parseSystemForm(form: SystemForm): OwnerSettings | null {
  const defaultPackageValidityDays = Number(form.defaultPackageValidityDays);
  const defaultSessionDurationMinutes = Number(form.defaultSessionDurationMinutes);
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
