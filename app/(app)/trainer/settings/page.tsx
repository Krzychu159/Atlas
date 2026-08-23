"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Lock, MapPin, Settings2, User } from "lucide-react";
import OutlookIntegrationCard from "@/app/(app)/owner/settings/components/OutlookIntegrationCard";
import AvatarFilePicker from "@/app/components/ui/avatar-file-picker";
import { Button } from "@/app/components/ui/button";
import { showAppError } from "@/app/components/ui/app-toast";
import {
  getTrainerPortalMe,
  type TrainerPortalMe,
} from "@/app/lib/trainer/portal";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  bio: string;
};

function splitFullName(value?: string | null) {
  const parts = (value || "").trim().split(" ").filter(Boolean);
  const firstName = parts.shift() || "";

  return {
    firstName,
    lastName: parts.join(" "),
  };
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "T";
}

function toProfileForm(me: TrainerPortalMe | null): ProfileForm {
  const names = splitFullName(me?.fullName);

  return {
    firstName: names.firstName,
    lastName: names.lastName,
    phone: me?.phone || "",
    avatarUrl: me?.avatarUrl || "",
    bio: me?.bio || "",
  };
}

export default function TrainerSettingsPage() {
  const [me, setMe] = useState<TrainerPortalMe | null>(null);
  const [form, setForm] = useState<ProfileForm>(() => toProfileForm(null));
  const [isLoading, setIsLoading] = useState(true);

  const locationNames = useMemo(
    () => me?.locationNames?.filter(Boolean).join(", ") || "Brak lokalizacji",
    [me],
  );

  async function loadProfile() {
    try {
      setIsLoading(true);
      const data = await getTrainerPortalMe();
      setMe(data);
      setForm(toProfileForm(data));
    } catch (err) {
      showAppError(err, "Nie udało się pobrać profilu trenera.", {
        id: "trainer-profile-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <section>
        <p className="text-label text-primary-light">Ustawienia</p>
        <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
          Profil trenera
        </h1>
        <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
          Dane profilu i integracja z kalendarzem Microsoft Outlook.
        </p>
      </section>

      <section className="card-shell p-5 md:p-6">
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <div>
            <AvatarFilePicker
              value={form.avatarUrl}
              fallbackText={getInitials(form.firstName, form.lastName)}
              onChange={(value) =>
                setForm((current) => ({ ...current, avatarUrl: value }))
              }
            />

            <div className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
              <div className="flex items-center gap-2 text-primary-light">
                <MapPin size={16} />
                <p className="text-label">Lokalizacje</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {locationNames}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
                <User size={18} />
              </div>
              <p className="text-section-title">Dane profilu</p>
            </div>

            {isLoading ? (
              <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
                Ładowanie profilu...
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Imię">
                  <input
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
                  />
                </Field>

                <Field label="Nazwisko">
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
                  />
                </Field>

                <Field label="Telefon">
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
                  />
                </Field>

                <Field label="E-mail">
                  <input
                    value={me?.email || ""}
                    disabled
                    className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm text-on-surface-muted outline-none"
                  />
                </Field>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-label text-on-surface-muted">
                    Bio
                  </span>
                  <textarea
                    rows={4}
                    value={form.bio}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    className="w-full resize-none rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3 text-sm outline-none"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 text-sm text-on-surface-variant">
            <Info size={17} className="mt-0.5 shrink-0 text-warning-light" />
            <p>Edycja profilu nie jest jeszcze dostępna.</p>
          </div>
          <Button
            icon={<Lock size={16} />}
            disabled
            className="w-full sm:w-auto"
          >
            Zapisz zmiany w Profilu
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
            <Settings2 size={18} />
          </div>
          <div>
            <p className="text-section-title">Ustawienia systemowe</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Integracja i synchronizacja danych z Microsoft Outlook.
            </p>
          </div>
        </div>
        <OutlookIntegrationCard />
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-label text-on-surface-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
