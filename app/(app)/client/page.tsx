import {
  CalendarDays,
  Clock3,
  CreditCard,
  Dumbbell,
  MessageCircle,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[760px]">
              <p className="text-label text-on-surface-variant ">
                Witaj, Marek!
              </p>
              <h1 className="mt-2 text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
                Dziś jest środa, &nbsp;
                <span className="text-primary-light">
                  życzymy udanego treningu!
                </span>
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-[1.8fr_320px] gap-4 items-stretch">
            <div className="card-shell p-6 min-h-[290px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute right-8 top-8 text-on-surface-muted/25">
                <Dumbbell size={96} strokeWidth={1.5} />
              </div>

              <div className="relative z-10 max-w-[520px]">
                <span className="inline-flex px-4 py-2 rounded-full bg-surface-container-low text-label text-primary-light">
                  Kolejny trening
                </span>

                <h2 className="mt-12 text-[2rem] leading-[1.1] font-semibold tracking-tight">
                  Trening Personalny
                  <br />z Jakubem Kowalskim
                </h2>
              </div>

              <div className="relative z-10 flex items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <CalendarDays size={15} />
                    <p className="text-label">Jutro, 15 października</p>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <Clock3 size={18} className="text-primary-light" />
                    <p className="text-[2rem] leading-none font-semibold">
                      10:30
                    </p>
                  </div>
                </div>

                <button className="h-14 px-7 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold shadow-soft flex items-center gap-3 shrink-0">
                  Potwierdź obecność
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="card-shell p-6 flex flex-col items-center text-center justify-between">
              <div>
                <p className="text-label text-on-surface-variant">
                  Twój trener
                </p>

                <div className="relative mt-8 inline-flex">
                  <div className="h-28 w-28 rounded-full p-[4px] bg-primary-gradient">
                    <div className="h-full w-full rounded-full overflow-hidden bg-surface-container-low">
                      <img
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop"
                        alt="Jakub Kowalski"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <span className="absolute right-1 bottom-2 h-6 w-6 rounded-full bg-tertiary-light border-4 border-surface-container" />
                </div>

                <p className="mt-6 text-[1.75rem] leading-none font-semibold">
                  Jakub Kowalski
                </p>
                <p className="mt-4 text-label text-primary-light leading-6">
                  Specjalizacja: siła i
                  <br />
                  hipertrofia
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 w-full">
                <button className="h-14 rounded-[var(--radius-lg)] bg-surface-container-low text-on-surface font-medium">
                  Wiadomość
                </button>
                <button className="h-14 rounded-[var(--radius-lg)] bg-surface-container-low text-on-surface font-medium">
                  Plan
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.15fr_1.15fr] gap-4">
            <div className="card-shell p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-label text-on-surface-variant">
                    Postęp w pakiecie
                  </p>
                  <h3 className="mt-4 text-[2rem] leading-[1.12] font-semibold tracking-tight">
                    Wykorzystano 8 z 12
                    <br />
                    treningów
                  </h3>
                </div>

                <span className="px-3 py-1 rounded-full bg-tertiary-container text-tertiary-light text-sm font-semibold shrink-0">
                  67%
                </span>
              </div>

              <div className="mt-8 h-4 rounded-full bg-surface-container-low overflow-hidden">
                <div className="h-full w-[67%] rounded-full bg-primary-gradient" />
              </div>

              <div className="mt-5 flex items-center justify-between text-on-surface-variant">
                <p className="text-label">Zrealizowane: 8</p>
                <p className="text-label">Pozostało: 4</p>
              </div>
            </div>

            <div className="card-shell p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <CreditCard size={15} />
                    <p className="text-label">Płatności</p>
                  </div>

                  <div className="mt-4 flex items-end gap-3">
                    <p className="text-[3rem] leading-none font-semibold tracking-tight">
                      150 PLN
                    </p>
                    <p className="text-base text-on-surface-variant mb-1">
                      do zapłaty
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 h-px bg-white/6" />

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-label text-on-surface-variant">
                    Termin płatności
                  </p>
                  <p className="mt-3 text-[1.45rem] leading-none font-semibold">
                    25.10.2024
                  </p>
                </div>

                <button className="h-14 px-7 rounded-[var(--radius-full)] bg-white text-black font-semibold shrink-0">
                  Opłać teraz
                </button>
              </div>
            </div>
          </div>

          <div className="card-shell p-7 bg-surface-container-lowest">
            <div className="grid grid-cols-[220px_1fr_1fr_1fr_1fr] gap-6 items-end">
              <div>
                <p className="text-[5rem] leading-none font-semibold tracking-tight text-primary-light">
                  42
                </p>
                <p className="mt-4 text-[1.1rem] leading-[1.35] font-semibold">
                  Łącznie
                  <br />
                  wykonano
                  <br />
                  treningów
                  <br />w Atlas
                </p>
              </div>

              <div>
                <p className="text-label text-on-surface-variant">Kalorie</p>
                <p className="mt-4 text-[2rem] leading-none font-semibold">
                  24,500 kcal
                </p>
              </div>

              <div>
                <p className="text-label text-on-surface-variant">Czas</p>
                <p className="mt-4 text-[2rem] leading-none font-semibold">
                  63h 20m
                </p>
              </div>

              <div>
                <p className="text-label text-on-surface-variant">Ciężar</p>
                <p className="mt-4 text-[2rem] leading-none font-semibold">
                  12,400 kg
                </p>
              </div>

              <div>
                <p className="text-label text-on-surface-variant">Aktywność</p>
                <div className="mt-3 flex items-end gap-2 h-14">
                  <span className="w-2 rounded-full bg-primary-light/50 h-4" />
                  <span className="w-2 rounded-full bg-primary-light/60 h-8" />
                  <span className="w-2 rounded-full bg-primary-light h-11" />
                  <span className="w-2 rounded-full bg-primary-light/70 h-6" />
                  <span className="w-2 rounded-full bg-primary-light/85 h-9" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-page-title">
              Cześć Marek!
              <br />
              <span className="text-primary-light">Miłej środy!</span>
            </p>
            <p className="mt-5 text-label text-on-surface-variant">
              Dzisiaj masz dzień regeneracji
            </p>
          </div>

          <div className="card-shell p-5 relative overflow-hidden">
            <div className="absolute right-5 top-5 text-on-surface-muted/25">
              <CalendarDays size={54} strokeWidth={1.5} />
            </div>

            <p className="text-label text-primary-light">Kolejny trening</p>
            <p className="mt-6 text-[2rem] leading-none font-semibold">
              Jutro o 10:30
            </p>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full bg-tertiary-light" />
              <p className="text-[1.1rem] text-on-surface-variant">
                Gotowy na wyzwanie?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card-shell p-5 min-h-[190px] flex flex-col justify-between">
              <TrendingUp size={24} className="text-on-surface-variant" />

              <div>
                <p className="text-[3.5rem] leading-none font-semibold text-primary-light">
                  42
                </p>
                <p className="mt-4 text-label text-on-surface-variant leading-6">
                  Treningi łącznie
                </p>
              </div>
            </div>

            <div className="card-shell p-5 min-h-[190px] flex flex-col justify-between border border-white/10">
              <div className="flex items-start justify-between gap-3">
                <CreditCard size={24} className="text-primary-light" />
                <span className="px-3 py-1 rounded-full bg-error-container text-error-light text-sm font-semibold">
                  Zaległość
                </span>
              </div>

              <div>
                <p className="text-[2.4rem] leading-none font-semibold">
                  150 PLN
                </p>
                <p className="mt-4 text-label text-on-surface-variant">
                  Do opłacenia
                </p>
              </div>
            </div>
          </div>

          <div className="card-shell p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label text-on-surface-variant">
                  Twój pakiet
                </p>
                <p className="mt-4 text-[2rem] leading-none font-semibold">
                  8/12 treningów
                </p>
              </div>

              <p className="text-[2.3rem] leading-none font-semibold text-primary-light">
                66%
              </p>
            </div>

            <div className="mt-6 h-3 rounded-full bg-surface-container-low overflow-hidden">
              <div className="h-full w-[66%] rounded-full bg-primary-gradient" />
            </div>
          </div>

          <div className="card-shell p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-24 w-24 rounded-[18px] overflow-hidden bg-surface-container-low shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1566753323558-f4e0952af115?q=80&w=800&auto=format&fit=crop"
                  alt="Jakub Kowalski"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="text-label text-on-surface-variant">
                  Twój trener
                </p>
                <p className="mt-3 text-[1.9rem] leading-none font-semibold truncate">
                  Jakub Kowalski
                </p>
              </div>
            </div>

            <button className="h-14 w-14 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
              <MessageCircle size={22} />
            </button>
          </div>

          <div className="rounded-[28px] bg-primary-gradient p-8 text-[#06256d] shadow-ambient">
            <p className="text-[2rem] leading-[1.25] font-medium max-w-[320px]">
              Sprawdź nowe plany posiłków na ten tydzień!
            </p>

            <button className="mt-10 h-12 px-7 rounded-[18px] bg-white/80 text-primary font-semibold">
              Odkryj teraz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
