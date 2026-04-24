"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Lock, ArrowRight, Eye, EyeOff, Dumbbell } from "lucide-react";

function getRedirectPath(role?: string) {
  switch (role) {
    case "owner":
      return "/owner";
    case "trainer":
      return "/trainer";
    case "client":
      return "/client";
    default:
      return "/login";
  }
}

function LoginLoadingOverlay() {
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
            Autoryzacja
          </p>

          <h3 className="mt-3 text-[1.8rem] font-semibold leading-none tracking-tight text-on-surface">
            Logowanie...
          </h3>

          <p className="mt-4 max-w-[280px] text-[0.98rem] leading-7 text-on-surface-variant">
            Sprawdzamy dane i przygotowujemy Twój panel Atlas.
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Logowanie nie powiodło się.");
      }

      const role = data?.user?.role;
      router.replace(getRedirectPath(role));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen overflow-hidden bg-surface text-on-surface"
      aria-busy={isSubmitting}
    >
      <div className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.14),transparent_30%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[320px] w-[320px] bg-[radial-gradient(circle,rgba(0,118,51,0.12),transparent_60%)]" />

        <div className="hidden min-h-screen flex-col lg:flex">
          <header className="relative z-10 px-9 pt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-soft">
                  <Dumbbell size={18} className="text-on-primary" />
                </div>

                <div>
                  <p className="text-[2rem] font-semibold leading-none tracking-tight">
                    ATLAS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-9">
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="text-label text-on-surface-variant transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                >
                  Poproś o dostęp
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="text-label text-on-surface-variant transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                >
                  Wsparcie
                </button>
              </div>
            </div>
          </header>

          <main className="relative z-10 flex-1 px-9 pb-8 pt-10">
            <div className="mx-auto max-w-[1180px]">
              <div className="grid grid-cols-[1fr_0.92fr] overflow-hidden rounded-[32px] bg-surface-container shadow-[0_24px_80px_rgba(0,0,0,0.32)] outline outline-1 outline-white/[0.08]">
                <section className="relative flex min-h-[690px] flex-col justify-between overflow-hidden p-12">
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
                    <h1 className="mt-10 font-display text-[4.6rem] font-semibold leading-[0.92] tracking-[-0.04em]">
                      Zarządzaj swoim
                      <br />
                      <span className="text-primary-light">Studiem</span>
                      <br />
                      Treningowym
                    </h1>

                    <p className="mt-10 max-w-[430px] text-[1.05rem] leading-9 text-white/80">
                      Uzyskaj dostęp do centrum dowodzenia Atlas, aby zarządzać
                      trenerami i klientami, monitorować postępy i optymalizować
                      operacje swojego studia.
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center gap-7">
                    <div>
                      <p className="text-[2.3rem] font-semibold leading-none">
                        4.9/5
                      </p>
                      <p className="mt-2 text-label text-white/70">
                        Ocena operatora
                      </p>
                    </div>

                    <div className="h-11 w-px bg-white/12" />

                    <div>
                      <p className="text-[2.3rem] font-semibold leading-none">
                        100+
                      </p>
                      <p className="mt-2 text-label text-white/70">
                        Użytkowników
                      </p>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col justify-between bg-surface-container p-12">
                  <div>
                    <div className="mx-auto max-w-[460px]">
                      <h2 className="text-[2.25rem] font-semibold leading-none tracking-tight">
                        Zaloguj się
                      </h2>
                      <p className="mt-4 text-[1.05rem] leading-8 text-on-surface-variant">
                        Wprowadź swoje dane, aby uzyskać dostęp.
                      </p>

                      <form className="mt-12 space-y-7" onSubmit={handleSubmit}>
                        <div>
                          <label className="mb-3 block text-label text-on-surface-variant">
                            Adres e-mail
                          </label>

                          <div className="flex h-16 items-center gap-4 rounded-[24px] bg-surface-container-lowest px-5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <input
                              type="email"
                              placeholder="nazwa@studio.pl"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={isSubmitting}
                              className="w-full bg-transparent text-[1.05rem] outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="email"
                              required
                            />
                            <AtSign
                              size={22}
                              className="shrink-0 text-on-surface-muted"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <label className="text-label text-on-surface-variant">
                              Hasło
                            </label>

                            <button
                              type="button"
                              disabled={isSubmitting}
                              className="text-label text-primary-light transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
                            >
                              Zapomniałeś hasła?
                            </button>
                          </div>

                          <div className="flex h-16 items-center gap-4 rounded-[24px] bg-surface-container-lowest px-5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={isSubmitting}
                              className="w-full bg-transparent text-[1.05rem] outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                              autoComplete="current-password"
                              required
                            />

                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              disabled={isSubmitting}
                              className="shrink-0 text-on-surface-muted disabled:pointer-events-none disabled:opacity-50"
                              aria-label={
                                showPassword ? "Ukryj hasło" : "Pokaż hasło"
                              }
                            >
                              {showPassword ? (
                                <EyeOff size={22} />
                              ) : (
                                <Eye size={22} />
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
                          className="flex h-[66px] w-full items-center justify-center gap-3 rounded-[24px] bg-primary-gradient text-[1.05rem] font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
                        >
                          {isSubmitting ? "Logowanie..." : "Zaloguj się"}
                          <ArrowRight size={18} />
                        </button>
                      </form>

                      <div className="mt-12 border-t border-white/5 pt-10 text-center">
                        <p className="text-[1rem] text-on-surface-variant">
                          Pierwszy raz w Atlas?{" "}
                          <button
                            type="button"
                            disabled={isSubmitting}
                            className="font-semibold text-on-surface transition-colors hover:text-primary-light disabled:pointer-events-none disabled:opacity-50"
                          >
                            Poproś o dostęp
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>

          <footer className="relative z-10 px-9 pb-8">
            <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-8 text-on-surface-muted">
              <span className="text-label">© 2026 Atlas </span>
              <button
                type="button"
                disabled={isSubmitting}
                className="text-label transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
              >
                Prywatność
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="text-label transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
              >
                Warunki
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="text-label transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
              >
                Wsparcie
              </button>
            </div>
          </footer>
        </div>

        <div className="flex min-h-screen flex-col px-6 pb-10 pt-8 lg:hidden">
          <header className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-soft">
              <Dumbbell size={18} className="text-on-primary" />
            </div>

            <p className="text-[2rem] font-semibold leading-none tracking-tight">
              ATLAS
            </p>
          </header>

          <main className="flex flex-1 flex-col pt-10">
            <div>
              <h1 className="font-display text-[4.2rem] font-semibold leading-[0.88] tracking-[-0.05em]">
                UWOLNIJ
                <br />
                <span className="text-primary">POTENCJAŁ.</span>
              </h1>

              <p className="mt-5 text-[1.05rem] uppercase leading-8 tracking-[0.03em] text-on-surface-muted">
                Zaloguj się do swojego centrum dowodzenia
              </p>
            </div>

            <form className="mt-12 space-y-7" onSubmit={handleSubmit}>
              <div>
                <label className="mb-3 block text-label text-on-surface-variant">
                  Adres e-mail
                </label>

                <div className="flex h-16 items-center gap-4 rounded-[24px] bg-surface-container-lowest px-5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <AtSign
                    size={22}
                    className="shrink-0 text-on-surface-muted"
                  />
                  <input
                    type="email"
                    placeholder="nazwa@atlasops.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-transparent text-[1.05rem] outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-3 block text-label text-on-surface-variant">
                  Klucz bezpieczeństwa
                </label>

                <div className="flex h-16 items-center gap-4 rounded-[24px] bg-surface-container-lowest px-5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(183,196,255,0.3)]">
                  <Lock size={22} className="shrink-0 text-on-surface-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-transparent text-[1.05rem] outline-none placeholder:text-on-surface-muted disabled:cursor-not-allowed"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    className="shrink-0 text-on-surface-muted disabled:pointer-events-none disabled:opacity-50"
                    aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex cursor-pointer select-none items-center gap-4">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                    className="h-5 w-5 shrink-0 rounded border border-white/10 bg-surface-container-lowest disabled:cursor-not-allowed"
                  />
                  <span className="text-[1rem] uppercase tracking-[0.04em] text-on-surface-variant">
                    Zapamiętaj mnie
                  </span>
                </label>

                <button
                  type="button"
                  disabled={isSubmitting}
                  className="text-[1rem] font-medium uppercase tracking-[0.04em] text-primary-light disabled:pointer-events-none disabled:opacity-50"
                >
                  Zapomniałeś hasła?
                </button>
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-[74px] w-full items-center justify-center gap-4 rounded-[26px] bg-primary-gradient text-[1.15rem] font-semibold text-white shadow-ambient transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
              >
                {isSubmitting ? "Logowanie..." : "Zaloguj się"}
                <ArrowRight size={22} />
              </button>
            </form>

            <div className="mt-14 grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={isSubmitting}
                className="flex h-28 items-center justify-center gap-4 rounded-[26px] bg-surface-container px-6 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-container-low text-sm font-semibold text-primary-light">
                  G
                </div>
                <span className="text-label text-on-surface">Google</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                className="flex h-28 items-center justify-center gap-4 rounded-[26px] bg-surface-container px-6 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-container-low text-sm font-semibold text-on-surface">
                  iOS
                </div>
                <span className="text-label text-on-surface">Apple ID</span>
              </button>
            </div>
          </main>

          <footer className="pt-14 text-center">
            <p className="text-label text-on-surface-muted">
              © 2026 Atlas Kinetic Ops
            </p>

            <div className="mt-8 flex items-center justify-center gap-8">
              <button
                type="button"
                disabled={isSubmitting}
                className="text-label text-on-surface-muted transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
              >
                Prywatność
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="text-label text-on-surface-muted transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
              >
                Warunki
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="text-label text-on-surface-muted transition-colors hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
              >
                Wsparcie
              </button>
            </div>
          </footer>
        </div>

        {isSubmitting ? <LoginLoadingOverlay /> : null}
      </div>
    </div>
  );
}
