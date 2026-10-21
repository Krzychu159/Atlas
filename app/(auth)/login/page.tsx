"use client";

import { clearClientSession } from "@/app/lib/backend";

import { getErrorMessage } from "@/app/lib/backend";
import { getLoginRedirectPath } from "@/app/lib/auth/redirect";
import type { SessionRole } from "@/app/lib/auth/user";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Dumbbell,
  KeyRound,
  MailCheck,
} from "lucide-react";

type AuthMode = "login" | "forgot" | "reset";

type ApiMessage = {
  message?: string;
};

function getLoginNotice(reason: string | null) {
  if (reason === "session-expired") {
    return "Twoja sesja wygasła. Zaloguj się ponownie, żeby kontynuować pracę.";
  }

  if (reason === "invitation-accepted") {
    return "Konto zostało utworzone. Możesz się teraz zalogować.";
  }

  return "";
}

function getAuthCopy(mode: AuthMode) {
  if (mode === "forgot") {
    return {
      title: "Odzyskaj dostęp",
      description:
        "Podaj adres e-mail konta. Wyślemy instrukcję ustawienia nowego hasła.",
      submit: "Wyślij instrukcję",
      pending: "Wysyłanie...",
      loadingTitle: "Wysyłanie...",
      loadingDescription: "Przygotowujemy bezpieczny link do resetu hasła.",
    };
  }

  if (mode === "reset") {
    return {
      title: "Ustaw nowe hasło",
      description: "Wklej kod z linku do zmiany hasła i wpisz nowe hasło.",
      submit: "Zapisz nowe hasło",
      pending: "Zapisywanie...",
      loadingTitle: "Zapisywanie...",
      loadingDescription: "Aktualizujemy hasło do Twojego konta.",
    };
  }

  return {
    title: "Zaloguj się",
    description: "Wprowadź swoje dane, aby przejść do swojego panelu.",
    submit: "Zaloguj się",
    pending: "Logowanie...",
    loadingTitle: "Logowanie...",
    loadingDescription: "Sprawdzamy dane i przygotowujemy Twój panel Atlas.",
  };
}

async function readApiMessage(response: Response) {
  return response.json().catch(() => ({} as ApiMessage)) as Promise<ApiMessage>;
}

function LoginLoadingOverlay({ mode }: { mode: AuthMode }) {
  const copy = getAuthCopy(mode);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-bright/60 px-6 backdrop-blur-[20px]"
      role="status"
      aria-live="polite"
    >
      <div className="relative w-full max-w-[380px] overflow-hidden rounded-[32px] bg-surface-container-high p-8 shadow-[0_20px_40px_rgba(12,14,16,0.55)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(183,196,255,0.18),transparent_42%)]" />

        <div className="relative flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-surface-container-lowest">
            <div className="absolute h-20 w-20 animate-spin rounded-[28px] border-[3px] border-white/10 border-t-primary-light" />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-gradient shadow-ambient">
              <Dumbbell size={20} className="text-white" />
            </div>
          </div>

          <p className="mt-7 text-label uppercase tracking-[0.08em] text-primary-light">
            Logowanie
          </p>

          <h3 className="mt-3 text-[1.8rem] font-semibold leading-none tracking-tight text-on-surface">
            {copy.loadingTitle}
          </h3>

          <p className="mt-4 max-w-[280px] text-[0.98rem] leading-7 text-on-surface-variant">
            {copy.loadingDescription}
          </p>

          <div className="mt-7 flex w-full gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-lowest">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-primary-gradient" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    void Promise.resolve().then(() => {
      if (!active) return;
      const token = params.get("resetToken") || "";
      setEmail(params.get("email") || "");
      setResetToken(token);
      setMode(token ? "reset" : "login");
      setNotice(getLoginNotice(params.get("reason")));
    });
    return () => { active = false; };
  }, []);
  const authCopy = getAuthCopy(mode);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setShowPassword(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      const data = await readApiMessage(response);

      if (!response.ok) {
        throw new Error(data?.message || "Logowanie nie powiodło się.");
      }

      clearClientSession();
      const params = new URLSearchParams(window.location.search);
      const role = (data as { user?: { role?: SessionRole } })?.user?.role;
      router.replace(getLoginRedirectPath(role, params.get("next")));
      router.refresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });
      const data = await readApiMessage(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Nie udało się wysłać instrukcji resetu hasła.",
        );
      }

      setSuccess(
        "Jeśli konto istnieje, wysłaliśmy instrukcję resetu hasła na podany adres e-mail.",
      );
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");
    setSuccess("");

    if (!resetToken.trim()) {
      setError("Wklej kod z linku do zmiany hasła.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Nowe hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Hasła muszą być takie same.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken.trim(),
          newPassword,
        }),
        cache: "no-store",
      });
      const data = await readApiMessage(response);

      if (!response.ok) {
        throw new Error(data?.message || "Nie udało się ustawić nowego hasła.");
      }

      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMode("login");
      setSuccess("Hasło zostało zmienione. Możesz się zalogować.");
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-dvh overflow-hidden bg-surface text-on-surface"
      aria-busy={isSubmitting}
    >
      <div className="relative min-h-dvh">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.14),transparent_30%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[320px] w-[320px] bg-[radial-gradient(circle,rgba(0,118,51,0.12),transparent_60%)]" />

        <div className="hidden min-h-dvh flex-col lg:flex">
          <header className="relative z-10 px-9 pt-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-soft">
                <Dumbbell size={18} className="text-on-primary" />
              </div>

              <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
                ATLAS
              </p>
            </div>
          </header>

          <main className="relative z-10 flex flex-1 items-center justify-center px-9 py-6">
            <div className="w-full max-w-[1120px]">
              <div className="grid grid-cols-[1fr_0.92fr] overflow-hidden rounded-[32px] bg-surface-container shadow-[0_24px_80px_rgba(0,0,0,0.32)] outline outline-1 outline-white/[0.08]">
                <section className="relative flex min-h-[560px] flex-col justify-between overflow-hidden p-10 xl:p-12 2xl:min-h-[640px]">
                  <div className="absolute inset-0">
                    <img
                      src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&auto=format&fit=crop"
                      alt="Studio fitness"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.54),rgba(0,0,0,0.74))]" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.52),rgba(0,0,0,0.16))]" />
                  </div>

                  <div className="relative z-10 max-w-[470px]">
                    <h1 className="mt-6 font-display text-[3.6rem] font-semibold leading-[0.92] tracking-[-0.04em] xl:text-[4.25rem]">
                      Jedna platforma.
                      <br />
                      <span className="text-primary-light">Nielimitowane</span>
                      <br />
                      możliwości.
                    </h1>

                    <p className="mt-8 max-w-[430px] text-[1.05rem] leading-8 text-white/80">
                      Wszystko, czego potrzebujesz do organizacji treningów,
                      płatności i codziennej pracy — w jednym miejscu.
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center gap-7">
                    <div>
                      <p className="text-label font-semibold leading-none">
                        W JEDNYM MIEJSCU
                      </p>
                      <p className="mt-2 text-label text-white/70">
                        Treningi i płatności
                      </p>
                    </div>

                    <div className="h-11 w-px bg-white/12" />

                    <div>
                      <p className="text-label font-semibold leading-none">
                        ZAWSZE POD RĘKĄ
                      </p>
                      <p className="mt-2 text-label text-white/70">
                        Dostęp online
                      </p>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col justify-center bg-surface-container p-10 xl:p-12">
                  <div>
                    <div className="mx-auto max-w-[420px]">
                      <h2 className="text-[2rem] font-semibold leading-none tracking-tight">
                        {authCopy.title}
                      </h2>
                      <p className="mt-3 text-base leading-7 text-on-surface-variant">
                        {authCopy.description}
                      </p>

                      {notice ? (
                        <div className="mt-6 rounded-[var(--radius-lg)] border border-warning/20 bg-warning-container/20 px-4 py-3 text-sm leading-6 text-warning-light">
                          {notice}
                        </div>
                      ) : null}

                      {success ? (
                        <div className="mt-6 rounded-[var(--radius-lg)] border border-tertiary-light/20 bg-tertiary-container/30 px-4 py-3 text-sm leading-6 text-tertiary-light">
                          {success}
                        </div>
                      ) : null}

                      {mode === "login" ? (
                      <form className="mt-7 space-y-4 lg:mt-10 lg:space-y-5" onSubmit={handleSubmit}>
                        <div>
                          <label htmlFor="desktop-login-email" className="mb-2 block text-label text-on-surface-variant">
                            Adres e-mail
                          </label>

                          <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <input
                              id="desktop-login-email"
                              type="email"
                              placeholder="nazwa@studio.pl"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={isSubmitting}
                              className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="email"
                              required
                            />
                            <AtSign
                              size={20}
                              className="shrink-0 text-on-surface-muted"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <label htmlFor="desktop-login-password" className="text-label text-on-surface-variant">
                              Hasło
                            </label>

                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => changeMode("forgot")}
                              className="text-label text-primary-light transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                            >
                              Zapomniałeś hasła?
                            </button>
                          </div>

                          <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <input
                              id="desktop-login-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={isSubmitting}
                              className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="current-password"
                              required
                            />

                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              disabled={isSubmitting}
                              className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-muted transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light/40 disabled:pointer-events-none disabled:opacity-50"
                              aria-label={
                                showPassword ? "Ukryj hasło" : "Pokaż hasło"
                              }
                            >
                              {showPassword ? (
                                <EyeOff size={20} />
                              ) : (
                                <Eye size={20} />
                              )}
                            </button>
                          </div>
                        </div>

                        <label className="flex cursor-pointer select-none items-center gap-4">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={isSubmitting}
                            className="h-5 w-5 shrink-0 rounded border border-white/10 bg-surface-container-lowest disabled:cursor-not-allowed"
                          />
                          <span className="text-[1rem] text-on-surface-variant">
                            Zapamiętaj mnie
                          </span>
                        </label>

                        {error ? (
                          <p className="text-sm text-red-400">{error}</p>
                        ) : null}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient text-base font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
                        >
                          {isSubmitting ? authCopy.pending : authCopy.submit}
                          <ArrowRight size={18} />
                        </button>
                      </form>
                      ) : mode === "forgot" ? (
                      <form
                        className="mt-7 space-y-4 lg:mt-10 lg:space-y-5"
                        onSubmit={handleForgotSubmit}
                      >
                        <div>
                          <label htmlFor="desktop-forgot-email" className="mb-2 block text-label text-on-surface-variant">
                            Adres e-mail
                          </label>

                          <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <input
                              id="desktop-forgot-email"
                              type="email"
                              placeholder="nazwa@studio.pl"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={isSubmitting}
                              className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="email"
                              required
                            />
                            <AtSign
                              size={20}
                              className="shrink-0 text-on-surface-muted"
                            />
                          </div>
                        </div>

                        {error ? (
                          <p className="text-sm text-red-400">{error}</p>
                        ) : null}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient text-base font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
                        >
                          {isSubmitting ? authCopy.pending : authCopy.submit}
                          <MailCheck size={18} />
                        </button>

                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => changeMode("login")}
                            className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                          >
                            Wróć do logowania
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => changeMode("reset")}
                            className="text-sm font-semibold text-primary-light transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                          >
                            Mam kod do zmiany hasła
                          </button>
                        </div>
                      </form>
                      ) : (
                      <form
                        className="mt-7 space-y-4 lg:mt-10 lg:space-y-5"
                        onSubmit={handleResetSubmit}
                      >
                        <div>
                          <label htmlFor="desktop-reset-token" className="mb-2 block text-label text-on-surface-variant">
                            Kod do zmiany hasła
                          </label>

                          <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <KeyRound
                              size={20}
                              className="shrink-0 text-on-surface-muted"
                            />
                            <input
                              id="desktop-reset-token"
                              type="text"
                              placeholder="Wklej kod z linku do zmiany hasła"
                              value={resetToken}
                              onChange={(e) => setResetToken(e.target.value)}
                              disabled={isSubmitting}
                              className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="one-time-code"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="desktop-reset-password" className="mb-2 block text-label text-on-surface-variant">
                            Nowe hasło
                          </label>

                          <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <Lock
                              size={20}
                              className="shrink-0 text-on-surface-muted"
                            />
                            <input
                              id="desktop-reset-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Minimum 8 znaków"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              disabled={isSubmitting}
                              className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="new-password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              disabled={isSubmitting}
                              className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-muted transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light/40 disabled:pointer-events-none disabled:opacity-50"
                              aria-label={
                                showPassword ? "Ukryj hasło" : "Pokaż hasło"
                              }
                            >
                              {showPassword ? (
                                <EyeOff size={20} />
                              ) : (
                                <Eye size={20} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="desktop-reset-password-confirm" className="mb-2 block text-label text-on-surface-variant">
                            Powtórz hasło
                          </label>

                          <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <Lock
                              size={20}
                              className="shrink-0 text-on-surface-muted"
                            />
                            <input
                              id="desktop-reset-password-confirm"
                              type={showPassword ? "text" : "password"}
                              placeholder="Powtórz nowe hasło"
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              disabled={isSubmitting}
                              className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="new-password"
                              required
                            />
                          </div>
                        </div>

                        {error ? (
                          <p className="text-sm text-red-400">{error}</p>
                        ) : null}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient text-base font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
                        >
                          {isSubmitting ? authCopy.pending : authCopy.submit}
                          <ArrowRight size={18} />
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => changeMode("login")}
                          className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                        >
                          Wróć do logowania
                        </button>
                      </form>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>

          <footer className="relative z-10 px-9 pb-6">
            <div className="mx-auto flex max-w-[1120px] items-center justify-center gap-8 text-on-surface-muted">
              <span className="text-label">© 2026 Atlas </span>
            </div>
          </footer>
        </div>

        <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-6 sm:px-6 sm:pt-10 lg:hidden">
          <header className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-soft">
              <Dumbbell size={16} className="text-on-primary" />
            </div>

            <p className="text-[1.5rem] font-semibold leading-none tracking-tight">
              ATLAS
            </p>
          </header>

          <main className="flex flex-1 flex-col pt-8 sm:justify-center sm:pt-6">
            <div>
              <h1 className="font-display text-[clamp(2.25rem,11vw,3rem)] font-semibold leading-[0.9] tracking-[-0.04em]">
                {mode === "forgot" ? (
                  <>
                    ODZYSKAJ
                    <br />
                    <span className="text-primary">DOSTĘP.</span>
                  </>
                ) : mode === "reset" ? (
                  <>
                    USTAW
                    <br />
                    <span className="text-primary">HASŁO.</span>
                  </>
                ) : (
                  <>
                    UWOLNIJ
                    <br />
                    <span className="text-primary">POTENCJAŁ.</span>
                  </>
                )}
              </h1>

              <p className="mt-3 text-[0.8rem] uppercase leading-6 tracking-[0.04em] text-on-surface-muted">
                {authCopy.description}
              </p>

              {notice ? (
                <div className="mt-6 rounded-[var(--radius-lg)] border border-warning/20 bg-warning-container/20 px-4 py-3 text-sm leading-6 text-warning-light">
                  {notice}
                </div>
              ) : null}

              {success ? (
                <div className="mt-6 rounded-[var(--radius-lg)] border border-tertiary-light/20 bg-tertiary-container/30 px-4 py-3 text-sm leading-6 text-tertiary-light">
                  {success}
                </div>
              ) : null}
            </div>

            {mode === "login" ? (
            <form className="mt-7 space-y-4 lg:mt-10 lg:space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="mobile-login-email" className="mb-2 block text-label text-on-surface-variant">
                  Adres e-mail
                </label>

                <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <AtSign
                    size={20}
                    className="shrink-0 text-on-surface-muted"
                  />
                  <input
                    id="mobile-login-email"
                    type="email"
                    placeholder="nazwa@studio.pl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="mobile-login-password" className="mb-2 block text-label text-on-surface-variant">
                  Hasło
                </label>

                <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <Lock size={20} className="shrink-0 text-on-surface-muted" />
                  <input
                    id="mobile-login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-muted transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light/40 disabled:pointer-events-none disabled:opacity-50"
                    aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex min-h-11 cursor-pointer select-none items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                    className="h-5 w-5 shrink-0 rounded border border-white/10 bg-surface-container-lowest disabled:cursor-not-allowed"
                  />
                  <span className="text-[0.8rem] uppercase tracking-[0.04em] text-on-surface-variant">
                    Zapamiętaj mnie
                  </span>
                </label>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => changeMode("forgot")}
                  className="min-h-11 text-right text-[0.8rem] font-medium uppercase tracking-[0.04em] text-primary-light disabled:pointer-events-none disabled:opacity-50"
                >
                  Zapomniałeś hasła?
                </button>
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient text-base font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
              >
                {isSubmitting ? authCopy.pending : authCopy.submit}
                <ArrowRight size={20} />
              </button>
            </form>
            ) : mode === "forgot" ? (
            <form className="mt-7 space-y-4 lg:mt-10 lg:space-y-5" onSubmit={handleForgotSubmit}>
              <div>
                <label htmlFor="mobile-forgot-email" className="mb-2 block text-label text-on-surface-variant">
                  Adres e-mail
                </label>

                <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <AtSign
                    size={20}
                    className="shrink-0 text-on-surface-muted"
                  />
                  <input
                    id="mobile-forgot-email"
                    type="email"
                    placeholder="nazwa@studio.pl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient text-base font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
              >
                {isSubmitting ? authCopy.pending : authCopy.submit}
                <MailCheck size={20} />
              </button>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => changeMode("login")}
                  className="min-h-11 text-sm font-semibold uppercase tracking-[0.04em] text-on-surface-variant transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                >
                  Wróć
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => changeMode("reset")}
                  className="min-h-11 text-sm font-semibold uppercase tracking-[0.04em] text-primary-light transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                >
                  Mam kod do zmiany hasła
                </button>
              </div>
            </form>
            ) : (
            <form className="mt-7 space-y-4 lg:mt-10 lg:space-y-5" onSubmit={handleResetSubmit}>
              <div>
                <label htmlFor="mobile-reset-token" className="mb-2 block text-label text-on-surface-variant">
                  Kod do zmiany hasła
                </label>

                <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <KeyRound
                    size={20}
                    className="shrink-0 text-on-surface-muted"
                  />
                  <input
                    id="mobile-reset-token"
                    type="text"
                    placeholder="Wklej kod z linku do zmiany hasła"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    disabled={isSubmitting}
                    className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="mobile-reset-password" className="mb-2 block text-label text-on-surface-variant">
                  Nowe hasło
                </label>

                <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <Lock size={20} className="shrink-0 text-on-surface-muted" />
                  <input
                    id="mobile-reset-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 znaków"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-muted transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light/40 disabled:pointer-events-none disabled:opacity-50"
                    aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="mobile-reset-password-confirm" className="mb-2 block text-label text-on-surface-variant">
                  Powtórz hasło
                </label>

                <div className="flex h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 transition-shadow lg:h-14 focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <Lock size={20} className="shrink-0 text-on-surface-muted" />
                  <input
                    id="mobile-reset-password-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Powtórz nowe hasło"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient text-base font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
              >
                {isSubmitting ? authCopy.pending : authCopy.submit}
                <ArrowRight size={20} />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => changeMode("login")}
                className="min-h-11 text-sm font-semibold uppercase tracking-[0.04em] text-on-surface-variant transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
              >
                Wróć do logowania
              </button>
            </form>
            )}
          </main>

          <footer className="pt-8 text-center">
            <p className="text-label text-on-surface-muted">
              © 2026 Atlas
            </p>
          </footer>
        </div>

        {isSubmitting ? <LoginLoadingOverlay mode={mode} /> : null}
      </div>
    </div>
  );
}
