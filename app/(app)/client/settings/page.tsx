"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Lock, Mail, MapPin, Phone, User } from "lucide-react";
import AvatarFilePicker from "@/app/components/ui/avatar-file-picker";
import { Button } from "@/app/components/ui/button";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import {
  getClientPortalMe,
  requestClientPortalEmailChange,
  updateClientPortalMe,
  type ClientPortalMe,
} from "@/app/lib/client/portal";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  avatarUrl: string;
};

export default function ClientSettingsPage() {
  const [me, setMe] = useState<ClientPortalMe | null>(null);
  const [form, setForm] = useState<ProfileForm>(() => toProfileForm(null));
  const [requestedEmail, setRequestedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingEmail, setIsRequestingEmail] = useState(false);

  const initials = useMemo(
    () => getInitials(form.firstName, form.lastName, me?.fullName),
    [form.firstName, form.lastName, me?.fullName],
  );

  async function loadProfile() {
    try {
      setIsLoading(true);
      const data = await getClientPortalMe();
      setMe(data);
      setForm(toProfileForm(data));
      setRequestedEmail("");
    } catch (err) {
      showAppError(err, "Nie udało się pobrać profilu klienta.", {
        id: "client-profile-load-error",
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      const updated = await updateClientPortalMe({
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        avatarUrl: form.avatarUrl || null,
      });

      setMe(updated);
      setForm(toProfileForm(updated));
      showAppSuccess("Profil został zapisany.", {
        id: "client-profile-save-success",
      });
    } catch (err) {
      showAppError(err, "Nie udało się zapisać profilu.", {
        id: "client-profile-save-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEmailRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = requestedEmail.trim();

    if (!email) {
      showAppError(
        new Error("Wpisz nowy adres e-mail."),
        "Wpisz nowy adres e-mail.",
        { id: "client-email-empty" },
      );
      return;
    }

    try {
      setIsRequestingEmail(true);
      await requestClientPortalEmailChange({ requestedEmail: email });
      setRequestedEmail("");
      showAppSuccess("Prośba o zmianę e-maila została wysłana.", {
        id: "client-email-request-success",
      });
    } catch (err) {
      showAppError(err, "Nie udało się wysłać prośby o zmianę e-maila.", {
        id: "client-email-request-error",
      });
    } finally {
      setIsRequestingEmail(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <MobileSettings
        me={me}
        form={form}
        initials={initials}
        requestedEmail={requestedEmail}
        isLoading={isLoading}
        isSaving={isSaving}
        isRequestingEmail={isRequestingEmail}
        onFormChange={setForm}
        onRequestedEmailChange={setRequestedEmail}
        onSave={handleSave}
        onEmailRequest={handleEmailRequest}
      />

      <div className="hidden flex-col gap-6 md:flex">
      <section>
        <p className="text-label text-primary-light">Ustawienia</p>
        <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
          Profil klienta
        </h1>
        <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
          Dane kontaktowe widoczne dla studia i trenera.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSave} className="card-shell p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-light">
              <User size={18} />
            </div>
            <div>
              <p className="text-label text-on-surface-muted">Profil</p>
              <h2 className="font-display text-[1.65rem] font-semibold leading-none">
                Dane osobowe
              </h2>
            </div>
          </div>

          <div className="mt-6">
            <AvatarFilePicker
              value={form.avatarUrl}
              fallbackText={initials}
              onChange={(value) =>
                setForm((current) => ({ ...current, avatarUrl: value }))
              }
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Imię"
              value={form.firstName}
              onChange={(value) =>
                setForm((current) => ({ ...current, firstName: value }))
              }
              disabled={isLoading}
            />
            <TextField
              label="Nazwisko"
              value={form.lastName}
              onChange={(value) =>
                setForm((current) => ({ ...current, lastName: value }))
              }
              disabled={isLoading}
            />
            <TextField
              label="Telefon"
              value={form.phoneNumber}
              onChange={(value) =>
                setForm((current) => ({ ...current, phoneNumber: value }))
              }
              disabled={isLoading}
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={isSaving || isLoading}
              icon={<Lock size={16} />}
            >
              {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <div className="card-shell p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-light">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-label text-on-surface-muted">Konto</p>
                <h2 className="font-display text-[1.65rem] font-semibold leading-none">
                  E-mail
                </h2>
              </div>
            </div>

            <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
              <p className="text-label text-on-surface-muted">Aktualny adres</p>
              <p className="mt-2 text-base font-semibold">
                {me?.email || "Brak e-maila"}
              </p>
            </div>

            <form onSubmit={handleEmailRequest} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={requestedEmail}
                onChange={(event) => setRequestedEmail(event.target.value)}
                type="email"
                placeholder="Nowy adres e-mail"
                className="h-12 min-w-0 flex-1 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={isRequestingEmail}
              >
                {isRequestingEmail ? "Wysyłanie..." : "Poproś o zmianę"}
              </Button>
            </form>

            <p className="mt-3 text-sm leading-6 text-on-surface-muted">
              Zmiana e-maila wymaga potwierdzenia w studiu, dlatego wysyłasz
              prośbę zamiast edytować adres bezpośrednio.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              icon={<MapPin size={18} />}
              label="Lokalizacja"
              value={me?.locationName || "Brak lokalizacji"}
            />
            <InfoCard
              icon={<Phone size={18} />}
              label="Trener"
              value={me?.trainerFullName || "Nie przypisano"}
            />
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

function MobileSettings({
  me,
  form,
  initials,
  requestedEmail,
  isLoading,
  isSaving,
  isRequestingEmail,
  onFormChange,
  onRequestedEmailChange,
  onSave,
  onEmailRequest,
}: {
  me: ClientPortalMe | null;
  form: ProfileForm;
  initials: string;
  requestedEmail: string;
  isLoading: boolean;
  isSaving: boolean;
  isRequestingEmail: boolean;
  onFormChange: Dispatch<SetStateAction<ProfileForm>>;
  onRequestedEmailChange: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onEmailRequest: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section>
        <p className="text-label text-primary-light">Ustawienia</p>
        <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[0.95]">
          Profil klienta
        </h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Najważniejsze dane kontaktowe dla studia.
        </p>
      </section>

      <form onSubmit={onSave} className="card-shell p-5">
        <AvatarFilePicker
          value={form.avatarUrl}
          fallbackText={initials}
          onChange={(value) =>
            onFormChange((current) => ({ ...current, avatarUrl: value }))
          }
        />

        <div className="mt-5 flex flex-col gap-4">
          <TextField
            label="Imię"
            value={form.firstName}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, firstName: value }))
            }
            disabled={isLoading}
          />
          <TextField
            label="Nazwisko"
            value={form.lastName}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, lastName: value }))
            }
            disabled={isLoading}
          />
          <TextField
            label="Telefon"
            value={form.phoneNumber}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, phoneNumber: value }))
            }
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={isSaving || isLoading}
          icon={<Lock size={16} />}
          className="mt-5 w-full"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz profil"}
        </Button>
      </form>

      <section className="grid grid-cols-2 gap-3">
        <InfoCard
          icon={<MapPin size={18} />}
          label="Lokalizacja"
          value={me?.locationName || "Brak lokalizacji"}
        />
        <InfoCard
          icon={<Phone size={18} />}
          label="Trener"
          value={me?.trainerFullName || "Nie przypisano"}
        />
      </section>

      <form onSubmit={onEmailRequest} className="card-shell p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-light">
            <Mail size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-label text-on-surface-muted">E-mail</p>
            <p className="truncate text-sm font-semibold">
              {me?.email || "Brak e-maila"}
            </p>
          </div>
        </div>

        <input
          value={requestedEmail}
          onChange={(event) => onRequestedEmailChange(event.target.value)}
          type="email"
          placeholder="Nowy adres e-mail"
          className="mt-5 h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
        />

        <Button
          type="submit"
          variant="secondary"
          disabled={isRequestingEmail}
          className="mt-3 w-full"
        >
          {isRequestingEmail ? "Wysyłanie..." : "Poproś o zmianę e-maila"}
        </Button>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none placeholder:text-on-surface-muted disabled:opacity-60"
      />
    </label>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-light">
        {icon}
      </div>
      <p className="mt-4 text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}

function toProfileForm(me: ClientPortalMe | null): ProfileForm {
  const names = splitFullName(me);

  return {
    firstName: names.firstName,
    lastName: names.lastName,
    phoneNumber: me?.phoneNumber || "",
    avatarUrl: me?.avatarUrl || "",
  };
}

function splitFullName(me: ClientPortalMe | null) {
  if (me?.firstName || me?.lastName) {
    return {
      firstName: me.firstName || "",
      lastName: me.lastName || "",
    };
  }

  const parts = (me?.fullName || "").trim().split(" ").filter(Boolean);
  const firstName = parts.shift() || "";

  return {
    firstName,
    lastName: parts.join(" "),
  };
}

function getInitials(
  firstName: string,
  lastName: string,
  fullName?: string | null,
) {
  const fallbackParts = (fullName || "").trim().split(" ").filter(Boolean);
  const first = firstName || fallbackParts[0] || "";
  const last = lastName || fallbackParts[1] || "";

  return `${first[0] || ""}${last[0] || ""}`.toUpperCase() || "K";
}
