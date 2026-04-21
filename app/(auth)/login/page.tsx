"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Lock, ArrowRight, Eye, EyeOff, Dumbbell } from "lucide-react";

function getRedirectPath(role?: string) {
  switch (role) {
    case "Owner":
      return "/owner";
    case "Trainer":
      return "/trainer";
    case "Client":
      return "/client";
    default:
      return "/";
  }
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
      const response = await fetch("/api/login", {
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
      router.push(getRedirectPath(role));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface overflow-hidden">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.14),transparent_30%)] pointer-events-none" />
        <div className="absolute left-0 bottom-0 h-[320px] w-[320px] bg-[radial-gradient(circle,rgba(0,118,51,0.12),transparent_60%)] pointer-events-none" />

        {/* Desktop */}
        <div className="hidden lg:flex min-h-screen flex-col">
          <header className="relative z-10 px-9 pt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-soft">
                  <Dumbbell size={18} className="text-on-primary" />
                </div>

                <div>
                  <p className="text-[2rem] leading-none font-semibold tracking-tight">
                    ATLAS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-9">
                <button className="text-label text-on-surface-variant hover:text-on-surface transition-colors">
                  Poproś o dostęp
                </button>
                <button className="text-label text-on-surface-variant hover:text-on-surface transition-colors">
                  Wsparcie
                </button>
              </div>
            </div>
          </header>

          <main className="relative z-10 flex-1 px-9 pb-8 pt-10">
            <div className="mx-auto max-w-[1180px]">
              <div className="grid grid-cols-[1fr_0.92fr] rounded-[32px] overflow-hidden border border-white/8 bg-surface-container shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                <section className="relative min-h-[690px] p-12 flex flex-col justify-between overflow-hidden">
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
                    <h1 className="mt-10 text-[4.6rem] leading-[0.92] font-semibold font-display tracking-[-0.04em]">
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
                      <p className="text-[2.3rem] leading-none font-semibold">
                        4.9/5
                      </p>
                      <p className="mt-2 text-label text-white/70">
                        Ocena operatora
                      </p>
                    </div>

                    <div className="h-11 w-px bg-white/12" />

                    <div>
                      <p className="text-[2.3rem] leading-none font-semibold">
                        12k+
                      </p>
                      <p className="mt-2 text-label text-white/70">
                        Aktywne studia
                      </p>
                    </div>
                  </div>
                </section>

                <section className="bg-surface-container p-12 flex flex-col justify-between">
                  <div>
                    <div className="max-w-[460px] mx-auto">
                      <h2 className="text-[2.25rem] leading-none font-semibold tracking-tight">
                        Zaloguj się
                      </h2>
                      <p className="mt-4 text-[1.05rem] text-on-surface-variant leading-8">
                        Wprowadź swoje dane, aby uzyskać dostęp.
                      </p>

                      <form className="mt-12 space-y-7" onSubmit={handleSubmit}>
                        <div>
                          <label className="block mb-3 text-label text-on-surface-variant">
                            Adres e-mail
                          </label>

                          <div className="h-16 rounded-[24px] bg-surface-container-lowest px-5 flex items-center gap-4">
                            <input
                              type="email"
                              placeholder="nazwa@studio.pl"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-transparent outline-none text-[1.05rem] placeholder:text-on-surface-muted"
                              autoComplete="email"
                              required
                            />
                            <AtSign
                              size={22}
                              className="text-on-surface-muted shrink-0"
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
                              className="text-label text-primary-light hover:text-on-surface transition-colors"
                            >
                              Zapomniałeś hasła?
                            </button>
                          </div>

                          <div className="h-16 rounded-[24px] bg-surface-container-lowest px-5 flex items-center gap-4">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-transparent outline-none text-[1.05rem] placeholder:text-on-surface-muted"
                              autoComplete="current-password"
                              required
                            />

                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="text-on-surface-muted shrink-0"
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

                        <label className="flex items-center gap-4 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-5 w-5 rounded border border-white/10 bg-surface-container-lowest shrink-0"
                          />
                          <span className="text-[1rem] text-on-surface-variant">
                            Zapamiętaj mnie przez 30 dni
                          </span>
                        </label>

                        {error ? (
                          <p className="text-sm text-red-400">{error}</p>
                        ) : null}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-[66px] rounded-[24px] bg-primary-gradient text-white font-semibold text-[1.05rem] shadow-ambient flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? "Logowanie..." : "Zaloguj się"}
                          <ArrowRight size={18} />
                        </button>
                      </form>

                      <div className="mt-12 border-t border-white/5 pt-10 text-center">
                        <p className="text-[1rem] text-on-surface-variant">
                          Pierwszy raz w Atlas?{" "}
                          <button className="font-semibold text-on-surface hover:text-primary-light transition-colors">
                            Poproś o dostęp operacyjny
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
            <div className="mx-auto max-w-[1180px] flex items-center justify-center gap-8 text-on-surface-muted">
              <span className="text-label">© 2024 Atlas Kinetic Ops</span>
              <button className="text-label hover:text-on-surface transition-colors">
                Prywatność
              </button>
              <button className="text-label hover:text-on-surface transition-colors">
                Warunki
              </button>
              <button className="text-label hover:text-on-surface transition-colors">
                Wsparcie
              </button>
            </div>
          </footer>
        </div>

        {/* Mobile */}
        <div className="lg:hidden min-h-screen flex flex-col px-6 pt-8 pb-10">
          <header className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-soft">
              <Dumbbell size={18} className="text-on-primary" />
            </div>

            <p className="text-[2rem] leading-none font-semibold tracking-tight">
              ATLAS
            </p>
          </header>

          <main className="flex-1 flex flex-col pt-10">
            <div>
              <h1 className="text-[4.2rem] leading-[0.88] font-semibold font-display tracking-[-0.05em]">
                UWOLNIJ
                <br />
                <span className="text-primary">POTENCJAŁ.</span>
              </h1>

              <p className="mt-5 text-[1.05rem] leading-8 text-on-surface-muted uppercase tracking-[0.03em]">
                Zaloguj się do swojego centrum dowodzenia
              </p>
            </div>

            <form className="mt-12 space-y-7" onSubmit={handleSubmit}>
              <div>
                <label className="block mb-3 text-label text-on-surface-variant">
                  Adres e-mail
                </label>

                <div className="h-16 rounded-[24px] bg-surface-container-lowest px-5 flex items-center gap-4">
                  <AtSign
                    size={22}
                    className="text-on-surface-muted shrink-0"
                  />
                  <input
                    type="email"
                    placeholder="nazwa@atlasops.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent outline-none text-[1.05rem] placeholder:text-on-surface-muted"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-3 text-label text-on-surface-variant">
                  Klucz bezpieczeństwa
                </label>

                <div className="h-16 rounded-[24px] bg-surface-container-lowest px-5 flex items-center gap-4">
                  <Lock size={22} className="text-on-surface-muted shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent outline-none text-[1.05rem] placeholder:text-on-surface-muted"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-on-surface-muted shrink-0"
                    aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-5 w-5 rounded border border-white/10 bg-surface-container-lowest shrink-0"
                  />
                  <span className="text-[1rem] text-on-surface-variant uppercase tracking-[0.04em]">
                    Zapamiętaj mnie
                  </span>
                </label>

                <button
                  type="button"
                  className="text-[1rem] font-medium uppercase tracking-[0.04em] text-primary-light"
                >
                  Zapomniałeś hasła?
                </button>
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[74px] rounded-[26px] bg-primary-gradient text-white font-semibold text-[1.15rem] shadow-ambient flex items-center justify-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Logowanie..." : "Zaloguj się"}
                <ArrowRight size={22} />
              </button>
            </form>

            <div className="mt-14 grid grid-cols-2 gap-4">
              <button className="h-28 rounded-[26px] bg-surface-container px-6 flex items-center justify-center gap-4">
                <div className="h-8 w-8 rounded-[10px] bg-surface-container-low flex items-center justify-center text-primary-light text-sm font-semibold">
                  G
                </div>
                <span className="text-label text-on-surface">Google</span>
              </button>

              <button className="h-28 rounded-[26px] bg-surface-container px-6 flex items-center justify-center gap-4">
                <div className="h-8 w-8 rounded-[10px] bg-surface-container-low flex items-center justify-center text-on-surface text-sm font-semibold">
                  iOS
                </div>
                <span className="text-label text-on-surface">Apple ID</span>
              </button>
            </div>
          </main>

          <footer className="pt-14 text-center">
            <p className="text-label text-on-surface-muted">
              © 2024 Atlas Kinetic Ops
            </p>

            <div className="mt-8 flex items-center justify-center gap-8">
              <button className="text-label text-on-surface-muted hover:text-on-surface transition-colors">
                Prywatność
              </button>
              <button className="text-label text-on-surface-muted hover:text-on-surface transition-colors">
                Warunki
              </button>
              <button className="text-label text-on-surface-muted hover:text-on-surface transition-colors">
                Wsparcie
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
