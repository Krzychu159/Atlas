"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  AtSign,
  Check,
  Dumbbell,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  acceptInvitation,
  type InvitationDetails,
  validateInvitation,
} from "@/app/lib/invitations";

type ValidationState =
  | { status: "loading" }
  | { status: "valid"; invitation: InvitationDetails }
  | { status: "invalid"; message: string };

type AcceptInvitationFormProps = {
  token: string;
};

const inputClassName =
  "h-14 w-full rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-lowest px-12 text-sm font-semibold text-on-surface outline-none transition placeholder:font-normal placeholder:text-on-surface-muted focus:border-primary-light focus:ring-2 focus:ring-primary/20";

export default function AcceptInvitationForm({
  token,
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const [validation, setValidation] = useState<ValidationState>({
    status: "loading",
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    validateInvitation(token, controller.signal)
      .then((invitation) => {
        setValidation({ status: "valid", invitation });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setValidation({
          status: "invalid",
          message: getInvitationError(error),
        });
      });

    return () => controller.abort();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Wpisane hasła nie są takie same.");
      return;
    }

    if (validation.status !== "valid") return;

    setIsSubmitting(true);

    try {
      await acceptInvitation({
        token,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });

      const params = new URLSearchParams({
        reason: "invitation-accepted",
      });

      if (validation.invitation.email) {
        params.set("email", validation.invitation.email);
      }

      router.replace(`/login?${params.toString()}`);
    } catch (error) {
      setFormError(getInvitationError(error));
      setIsSubmitting(false);
    }
  }

  const missingToken = !token;

  return (
    <main className="min-h-screen bg-surface px-4 py-6 sm:px-6 sm:py-10 lg:flex lg:items-center lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-surface-container-low shadow-ambient lg:min-h-[720px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-surface-container-lowest p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(74,109,255,0.22),transparent_43%)]" />
          <div className="relative">
            <Link href="/login" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-gradient shadow-ambient">
                <Dumbbell size={20} className="text-white" />
              </span>
              <span className="font-display text-2xl font-bold tracking-tight text-on-surface">
                Atlas
              </span>
            </Link>

            <p className="mt-20 text-xs font-bold uppercase tracking-[0.12em] text-primary-light">
              Zaproszenie do systemu
            </p>
            <h1 className="mt-4 max-w-md font-display text-5xl font-semibold leading-[1.05] tracking-tight text-on-surface">
              Twoje konto jest prawie gotowe.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-on-surface-variant">
              Potwierdź dane, ustaw bezpieczne hasło i zacznij korzystać z Atlas
              w swojej lokalizacji.
            </p>
          </div>

          <div className="relative grid gap-3 text-sm text-on-surface-variant">
            <Feature text="Poprawnie otworzono zaproszenie" />
            <Feature text="Ustaw silne hasło" />
            <Feature text="Po aktywacji przejdziesz od razu do logowania" />
          </div>
        </section>

        <section className="flex min-h-[640px] flex-col p-5 sm:p-8 lg:p-12">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Link href="/login" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-gradient">
                <Dumbbell size={18} className="text-white" />
              </span>
              <span className="font-display text-xl font-bold text-on-surface">
                Atlas
              </span>
            </Link>
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-light">
              Aktywacja konta
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
            {missingToken ? (
              <InvitationErrorState
                title="Brakuje tokenu zaproszenia"
                description="Ten adres nie zawiera danych potrzebnych do aktywacji konta. Otwórz pełny link z wiadomości e-mail."
              />
            ) : validation.status === "loading" ? (
              <InvitationLoadingState />
            ) : validation.status === "invalid" ? (
              <InvitationErrorState
                title="Nie możemy użyć tego zaproszenia"
                description={validation.message}
              />
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary-light">
                  Ważne zaproszenie
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl">
                  Utwórz swoje konto
                </h2>

                <InvitationSummary invitation={validation.invitation} />

                <form className="mt-7" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="firstName"
                      label="Imię"
                      icon={<UserRound size={17} />}
                    >
                      <input
                        id="firstName"
                        name="firstName"
                        autoComplete="given-name"
                        className={inputClassName}
                        placeholder="Jan"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        required
                      />
                    </Field>
                    <Field
                      id="lastName"
                      label="Nazwisko"
                      icon={<UserRound size={17} />}
                    >
                      <input
                        id="lastName"
                        name="lastName"
                        autoComplete="family-name"
                        className={inputClassName}
                        placeholder="Kowalski"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        required
                      />
                    </Field>
                    <Field
                      id="password"
                      label="Hasło"
                      icon={<LockKeyhole size={17} />}
                    >
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`${inputClassName} pr-12`}
                        placeholder="Minimum 8 znaków"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        required
                      />
                      <PasswordVisibilityButton
                        visible={showPassword}
                        onClick={() => setShowPassword((visible) => !visible)}
                      />
                    </Field>
                    <Field
                      id="confirmPassword"
                      label="Powtórz hasło"
                      icon={<LockKeyhole size={17} />}
                    >
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`${inputClassName} pr-12`}
                        placeholder="Wpisz hasło ponownie"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        minLength={8}
                        required
                      />
                    </Field>
                  </div>

                  {formError ? (
                    <div
                      className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-error/30 bg-error/10 px-4 py-3 text-sm leading-5 text-error-light"
                      role="alert"
                    >
                      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-gradient px-6 text-sm font-bold text-white shadow-ambient transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle size={18} className="animate-spin" />
                        Tworzenie konta...
                      </>
                    ) : (
                      <>
                        Akceptuj zaproszenie
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function InvitationSummary({ invitation }: { invitation: InvitationDetails }) {
  const role = getRoleLabel(invitation.role);

  return (
    <div className="mt-6 grid gap-3 rounded-[var(--radius-xl)] border border-white/10 bg-surface-container-lowest p-4 sm:grid-cols-2">
      <SummaryItem
        icon={<AtSign size={16} />}
        label="Adres e-mail"
        value={invitation.email || "Nie podano"}
      />
      <SummaryItem icon={<UserRound size={16} />} label="Rola" value={role} />
      <SummaryItem
        icon={<MapPin size={16} />}
        label="Lokalizacja"
        value={invitation.locationName || "Nie podano"}
      />
      {invitation.trainerName ? (
        <SummaryItem
          icon={<ShieldCheck size={16} />}
          label="Trener prowadzący"
          value={invitation.trainerName}
        />
      ) : null}
      <SummaryItem
        icon={<ShieldCheck size={16} />}
        label="Ważne do"
        value={formatExpiration(invitation.expiresAt)}
      />
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low p-3.5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-muted">
        <span className="text-primary-light">{icon}</span>
        {label}
      </div>
      <p
        className="mt-2 truncate text-sm font-bold text-on-surface"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface-muted"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary-light">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function PasswordVisibilityButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-on-surface-muted transition hover:text-on-surface"
      aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

function InvitationLoadingState() {
  return (
    <div className="flex flex-col items-center py-16 text-center" role="status">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary-light">
        <LoaderCircle size={28} className="animate-spin" />
      </div>
      <h2 className="mt-6 font-display text-2xl font-semibold text-on-surface">
        Sprawdzamy zaproszenie
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">
        Potwierdzamy, czy link jest aktywny i do jakiego konta prowadzi.
      </p>
    </div>
  );
}

function InvitationErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-error/10 text-error-light">
        <TriangleAlert size={28} />
      </div>
      <h2 className="mt-6 font-display text-2xl font-semibold text-on-surface">
        {title}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
        {description}
      </p>
      <p className="mt-3 max-w-md text-xs leading-5 text-on-surface-muted">
        Jeśli zaproszenie wygasło lub zostało już wykorzystane, poproś studio o
        wysłanie nowego linku.
      </p>
      <Link
        href="/login"
        className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-high px-6 text-sm font-bold text-on-surface transition hover:bg-surface-bright"
      >
        Przejdź do logowania
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tertiary/15 text-tertiary-light">
        <Check size={15} />
      </span>
      {text}
    </div>
  );
}

function getRoleLabel(role: string | null) {
  const normalizedRole = role?.toLowerCase();

  if (normalizedRole === "client") return "Klient";
  if (normalizedRole === "trainer") return "Trener";
  if (normalizedRole === "owner") return "Owner";

  return role || "Użytkownik";
}

function formatExpiration(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Nie podano";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInvitationError(error: unknown) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return "Nie udało się obsłużyć zaproszenia. Spróbuj ponownie później.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("expired") || message.includes("wygas")) {
    return "To zaproszenie wygasło. Poproś studio o wysłanie nowego linku.";
  }

  if (
    message.includes("invalid") ||
    message.includes("not found") ||
    message.includes("nieprawid")
  ) {
    return "Link jest nieprawidłowy albo zaproszenie zostało już wykorzystane.";
  }

  return error.message;
}
