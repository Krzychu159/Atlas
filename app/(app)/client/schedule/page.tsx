import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  X,
} from "lucide-react";

const calendarDays = [
  { day: "28", label: "Pon", muted: true },
  { day: "29", label: "Wt", muted: true },
  { day: "30", label: "Śr", muted: true },
  { day: "31", label: "Czw", muted: true },
  { day: "1", label: "Pt" },
  { day: "2", label: "Sob" },
  { day: "3", label: "Ndz" },
  { day: "4", label: "Pon" },
  { day: "5", label: "Wt", selected: true },
  { day: "6", label: "Śr" },
  { day: "7", label: "Czw" },
  { day: "8", label: "Pt" },
  { day: "9", label: "Sob" },
  { day: "10", label: "Ndz" },
];

const sessionHistory = [
  {
    date: "31 Październik",
    time: "18:00 - 19:15",
    type: "Body Pump Express",
    trainer: "Anna Nowak",
    intensity: 3,
    status: "Obecny",
  },
  {
    date: "29 Październik",
    time: "10:00 - 11:30",
    type: "Strength Session",
    trainer: "Marek Kowalski",
    intensity: 4,
    status: "Obecny",
  },
];

export default function SchedulePage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[560px]">
              <p className="text-label text-primary-light">Harmonogram</p>
              <h1 className="mt-2 text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
                Twoje <span className="text-primary-light">Treningi</span>
              </h1>
            </div>

            <div className="text-right shrink-0">
              <p className="text-base text-on-surface-variant">
                Pozostałe sesje
              </p>
              <div className="mt-2 flex items-center justify-end gap-4">
                <p className="text-[2rem] leading-none font-semibold">
                  12 / 20
                </p>
                <div className="h-14 w-14 rounded-full bg-surface-container flex items-center justify-center text-primary-light">
                  <CalendarDays size={22} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_360px] gap-4 items-start">
            <div className="card-shell p-5 min-h-[985px]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[1.2rem] font-semibold">Listopad 2024</p>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button className="h-12 w-12 rounded-[16px] bg-surface-container-low flex items-center justify-center text-on-surface">
                      <ChevronLeft size={18} />
                    </button>
                    <button className="h-12 w-12 rounded-[16px] bg-surface-container-low flex items-center justify-center text-on-surface">
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low p-1">
                    <button className="px-5 py-2.5 rounded-[10px] bg-surface-container-high text-on-surface-variant text-sm font-medium">
                      Miesiąc
                    </button>
                    <button className="px-5 py-2.5 rounded-[10px] bg-primary text-on-primary text-sm font-medium">
                      Tydzień
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] bg-surface-container-low">
                <div className="grid grid-cols-7 border-b border-white/5">
                  {["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-14 flex items-center justify-center text-label text-on-surface-variant"
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>

                <div className="grid grid-cols-7 auto-rows-[190px]">
                  {calendarDays.map((item) => (
                    <div
                      key={`${item.label}-${item.day}`}
                      className={`relative border-r border-b border-white/5 p-4 ${
                        item.selected ? "bg-primary/8" : ""
                      }`}
                    >
                      <p
                        className={`text-[1.8rem] leading-none font-semibold ${
                          item.muted
                            ? "text-on-surface-muted/60"
                            : "text-on-surface"
                        }`}
                      >
                        {item.day}
                      </p>

                      {item.day === "1" && (
                        <div className="mt-4 rounded-[18px] bg-primary-light/20 border-l-[3px] border-primary-light p-3">
                          <p className="text-sm text-primary-light font-medium">
                            08:00
                          </p>
                          <p className="mt-2 text-[1rem] leading-5 font-semibold">
                            Strength Training
                          </p>
                        </div>
                      )}

                      {item.day === "4" && (
                        <div className="mt-4 rounded-[18px] bg-tertiary-container/40 border-l-[3px] border-tertiary-light p-3">
                          <p className="text-sm text-tertiary-light font-medium">
                            17:30
                          </p>
                          <p className="mt-2 text-[1rem] leading-5 font-semibold">
                            Mobility Flow
                          </p>
                        </div>
                      )}

                      {item.day === "5" && (
                        <div className="space-y-3 mt-4">
                          <div className="rounded-[18px] bg-primary p-3 shadow-soft">
                            <p className="text-sm text-white/85 font-medium">
                              10:00
                            </p>
                            <p className="mt-2 text-[1rem] leading-5 font-semibold text-white">
                              Personal Training
                            </p>
                          </div>

                          <div className="rounded-[18px] bg-surface-container-high p-3">
                            <p className="text-sm text-on-surface-muted font-medium">
                              19:00
                            </p>
                            <p className="mt-2 text-[1rem] leading-5 font-semibold text-on-surface-variant">
                              Yoga
                            </p>
                          </div>
                        </div>
                      )}

                      {item.day === "7" && (
                        <div className="mt-4 rounded-[18px] bg-primary-light/20 border-l-[3px] border-primary-light p-3">
                          <p className="text-sm text-primary-light font-medium">
                            08:00
                          </p>
                          <p className="mt-2 text-[1rem] leading-5 font-semibold">
                            Conditioning
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="card-shell p-6">
                <p className="text-label text-on-surface-variant">
                  Najbliższa sesja
                </p>

                <div className="mt-5 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-[18px] overflow-hidden bg-surface-container-low shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1567013127542-490d757e6349?q=80&w=800&auto=format&fit=crop"
                      alt="Trener"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <p className="text-[1.85rem] leading-none font-semibold">
                      Personal Training
                    </p>
                    <p className="mt-2 text-base text-on-surface-variant">
                      Trener: Marek Kowalski
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[20px] bg-surface-container-lowest px-4 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={17} className="text-primary-light" />
                    <p className="text-[1rem] font-medium">Wtorek, 10:00</p>
                  </div>

                  <span className="px-4 py-2 rounded-full bg-tertiary-container text-tertiary-light text-sm font-semibold">
                    Potwierdzone
                  </span>
                </div>

                <button className="mt-5 w-full h-14 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold shadow-soft">
                  Oznacz obecność
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card-shell p-5 min-h-[156px] flex flex-col justify-between">
                  <Check size={22} className="text-primary-light" />
                  <div>
                    <p className="text-[3rem] leading-none font-semibold">
                      94%
                    </p>
                    <p className="mt-3 text-label text-on-surface-variant">
                      Obecność
                    </p>
                  </div>
                </div>

                <div className="card-shell p-5 min-h-[156px] flex flex-col justify-between">
                  <Plus size={22} className="text-tertiary-light" />
                  <div>
                    <p className="text-[3rem] leading-none font-semibold">8</p>
                    <p className="mt-3 text-label text-on-surface-variant">
                      Sesje / mc
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-shell p-6">
                <p className="text-section-title">Twoi trenerzy</p>

                <div className="mt-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-14 w-14 rounded-full p-[2px] bg-primary-gradient shrink-0">
                        <div className="h-full w-full rounded-full overflow-hidden bg-surface-container-low">
                          <img
                            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop"
                            alt="Marek Kowalski"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[1.25rem] font-semibold truncate">
                          Marek Kowalski
                        </p>
                        <p className="mt-1 text-label text-on-surface-variant">
                          Strength & Conditioning
                        </p>
                      </div>
                    </div>

                    <button className="h-11 w-11 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                      <MessageCircle size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 opacity-70">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-14 w-14 rounded-full overflow-hidden bg-surface-container-low shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop"
                          alt="Anna Nowak"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[1.25rem] font-semibold truncate">
                          Anna Nowak
                        </p>
                        <p className="mt-1 text-label text-on-surface-variant">
                          Yoga & Mobility
                        </p>
                      </div>
                    </div>

                    <button className="h-11 w-11 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/8 bg-surface-container-lowest p-6">
                <p className="text-label text-on-surface-variant">
                  Postęp celu
                </p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <p className="text-[1.7rem] leading-[1.2] font-semibold max-w-[220px]">
                    Redukcja Tkanki Tłuszczowej
                  </p>
                  <p className="text-[2.1rem] leading-none font-semibold text-tertiary-light">
                    72%
                  </p>
                </div>

                <div className="mt-6 h-3 rounded-full bg-surface-container-low overflow-hidden">
                  <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#00a84f,#4ae176)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="card-shell overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 bg-surface-container-low">
              <p className="text-section-title">Historia Sesji</p>
              <button className="text-label text-primary-light">
                Zobacz wszystkie
              </button>
            </div>

            <div className="grid grid-cols-[1.4fr_1.8fr_1.3fr_1.2fr_130px] px-6 py-5 text-label text-on-surface-variant border-b border-white/5">
              <p>Data</p>
              <p>Rodzaj treningu</p>
              <p>Trener</p>
              <p>Intensywność</p>
              <p>Status</p>
            </div>

            {sessionHistory.map((item, index) => (
              <div
                key={item.date}
                className={`grid grid-cols-[1.4fr_1.8fr_1.3fr_1.2fr_130px] px-6 py-7 items-center ${
                  index !== sessionHistory.length - 1
                    ? "border-b border-white/5"
                    : ""
                }`}
              >
                <div>
                  <p className="text-[1.25rem] font-semibold">{item.date}</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {item.time}
                  </p>
                </div>

                <p className="text-[1.2rem] font-medium">{item.type}</p>
                <p className="text-[1.1rem]">{item.trainer}</p>

                <div className="flex items-end gap-2 h-8">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <span
                      key={bar}
                      className={`w-2 rounded-full ${
                        bar <= item.intensity
                          ? "bg-tertiary-light h-7"
                          : "bg-white/12 h-5"
                      }`}
                    />
                  ))}
                </div>

                <div>
                  <span className="px-4 py-2 rounded-full bg-tertiary-container text-tertiary-light text-sm font-semibold">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-primary-light">Twój harmonogram</p>
              <h1 className="mt-2 text-page-title">Treningi</h1>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <Bell size={20} className="text-on-surface-variant" />
              <div className="h-12 w-12 rounded-full overflow-hidden bg-surface-container-low">
                <img
                  src="https://images.unsplash.com/photo-1567013127542-490d757e6349?q=80&w=800&auto=format&fit=crop"
                  alt="Profil użytkownika"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="h-14 rounded-[var(--radius-lg)] bg-surface-container text-on-surface font-semibold flex items-center justify-center gap-3">
              <CalendarDays size={18} />
              Miesiąc
            </button>

            <button className="h-14 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold flex items-center justify-center gap-3">
              <Plus size={18} />
              Umów sesję
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {[
              { day: "Pon", num: "12" },
              { day: "Wt", num: "13", active: true },
              { day: "Śr", num: "14" },
              { day: "Czw", num: "15" },
              { day: "Pt", num: "16" },
              { day: "Sob", num: "17", muted: true },
              { day: "Ndz", num: "18", muted: true },
            ].map((item) => (
              <button
                key={item.num}
                className={`relative min-w-[54px] h-[82px] rounded-[22px] flex flex-col items-center justify-center ${
                  item.active
                    ? "bg-primary/20 border border-primary/30"
                    : "bg-surface-container"
                }`}
              >
                <span
                  className={`text-label ${
                    item.muted ? "text-on-surface-muted/60" : "text-on-surface"
                  }`}
                >
                  {item.day}
                </span>
                <span
                  className={`mt-2 text-[2rem] leading-none font-semibold ${
                    item.active ? "text-white" : "text-on-surface"
                  }`}
                >
                  {item.num}
                </span>

                {item.active ? (
                  <span className="absolute bottom-[-6px] h-3 w-3 rounded-full bg-primary-light" />
                ) : null}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-4">
              <p className="text-section-title">Dzisiejsze sesje</p>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="card-shell overflow-hidden">
                <div className="h-[210px] overflow-hidden bg-surface-container-low">
                  <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop"
                    alt="Trening personalny"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-tertiary-container text-tertiary-light text-label">
                        Potwierdzony
                      </span>

                      <p className="mt-5 text-[2.2rem] leading-[1.05] font-semibold">
                        Trening
                        <br />
                        Personalny
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-label text-on-surface-variant">
                        Siłowy / Hipertrofia
                      </p>
                      <p className="mt-3 text-[3rem] leading-none font-semibold text-primary-light">
                        08:30
                      </p>
                      <p className="mt-2 text-label text-on-surface-variant">
                        60 minut
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary-light shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop"
                          alt="Marek Kowalski"
                          className="h-full w-full object-cover rounded-full"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-base font-semibold truncate">
                          Marek Kowalski
                        </p>
                        <p className="text-sm text-on-surface-variant truncate">
                          Senior Coach
                        </p>
                      </div>
                    </div>

                    <button className="text-label text-primary-light shrink-0">
                      Szczegóły →
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-shell p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <p className="text-[1.4rem] font-semibold leading-none">
                        17:00
                      </p>
                      <span className="text-label">•</span>
                      <span className="text-label">Mobility & Stretch</span>
                    </div>

                    <p className="mt-6 text-[2rem] leading-[1.05] font-semibold">
                      Sesja Regeneracyjna
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                    <MessageCircle size={14} />
                  </div>
                  <p className="text-base text-on-surface-variant">
                    Anna Nowak
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-center gap-4">
                  <button className="h-14 w-14 rounded-[18px] bg-surface-container-low flex items-center justify-center text-on-surface">
                    <Check size={20} />
                  </button>
                  <button className="h-14 w-14 rounded-[18px] bg-surface-container-low flex items-center justify-center text-on-surface">
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card-shell p-5">
            <p className="text-label text-on-surface-variant">
              Statystyki tygodnia
            </p>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[2.2rem] leading-none font-semibold">
                  3 / 5
                </p>
                <p className="mt-3 text-label text-on-surface-variant">
                  Treningi ukończone
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 rounded-full bg-surface-container-low overflow-hidden">
              <div className="h-full w-[60%] rounded-full bg-[linear-gradient(90deg,#00a84f,#4ae176)]" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest rounded-[22px] p-5">
                <p className="text-label text-on-surface-variant">Kalorie</p>
                <p className="mt-4 text-[2rem] leading-none font-semibold">
                  1,840
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-[22px] p-5">
                <p className="text-label text-on-surface-variant">Czas</p>
                <p className="mt-4 text-[2rem] leading-none font-semibold">
                  210m
                </p>
              </div>
            </div>
          </div>

          <div className="card-shell p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light shrink-0">
                <MessageCircle size={18} />
              </div>

              <div>
                <p className="text-base font-semibold">Wiadomość od trenera</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Marek Kowalski • 2h temu
                </p>
              </div>
            </div>

            <p className="mt-6 text-[1.05rem] leading-8 text-on-surface-variant italic">
              “Hej! Na dzisiejszym treningu skupimy się na martwym ciągu.
              Przygotuj się na większe obciążenie. Pamiętaj o porządnym
              śniadaniu!”
            </p>
          </div>

          <div className="rounded-[28px] overflow-hidden bg-surface-container-low">
            <div className="h-[180px] bg-[linear-gradient(135deg,#163f52,#305f74)] relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(183,196,255,0.1),transparent_55%)]" />
              <div className="absolute left-5 bottom-5">
                <p className="text-label text-primary-light">
                  Lokalizacja studia
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
