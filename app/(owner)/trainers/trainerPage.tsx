import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import {
  Search,
  Plus,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  ChevronRight,
  CalendarDays,
  Dumbbell,
  BadgeCheck,
  Pencil,
} from "lucide-react";

const trainers = [
  {
    id: 1,
    name: "Kamil Trener",
    role: "Specjalista treningu siłowego & redukcji",
    email: "k.trener@atlasstudio.pl",
    phone: "+48 500 200 300",
    sessions: 1248,
    rating: 4.9,
    experience: "8 lat",
    activeClients: 24,
    retention: "+15%",
    certifications: 7,
    plans: 124,
    badge: "PRO",
    highlight: true,
  },
  {
    id: 2,
    name: "Marek Kowalski",
    role: "Personal Performance Coach",
    email: "m.kowalski@atlasstudio.pl",
    phone: "+48 501 120 400",
    sessions: 986,
    rating: 4.8,
    experience: "6 lat",
    activeClients: 18,
    retention: "+12%",
    certifications: 5,
    plans: 96,
    badge: "PRO",
  },
  {
    id: 3,
    name: "Anna Nowak",
    role: "Coach siłowy i mobility",
    email: "a.nowak@atlasstudio.pl",
    phone: "+48 600 222 111",
    sessions: 804,
    rating: 4.7,
    experience: "5 lat",
    activeClients: 16,
    retention: "+8%",
    certifications: 4,
    plans: 82,
    badge: "ACTIVE",
  },
];

const clients = [
  {
    name: "Marek Kowalski",
    goal: "Cel: Hipertrofia • 4/12 tyg.",
    progress: "Progress +12%",
  },
  {
    name: "Anna Nowak",
    goal: "Cel: Redukcja • 8/12 tyg.",
    progress: "Progress +22%",
  },
  {
    name: "Piotr Wiśniewski",
    goal: "Cel: Wytrzymałość • 2/12 tyg.",
    progress: "Progress +2%",
  },
];

const schedule = [
  {
    time: "08:00",
    name: "Anna Nowak",
    details: "Trening funkcjonalny • Atlas Gym",
    done: true,
    now: false,
  },
  {
    time: "10:30",
    name: "Marek Kowalski",
    details: "Klatka & Barki • Atlas Gym",
    done: false,
    now: true,
  },
  {
    time: "16:00",
    name: "Piotr Wiśniewski",
    details: "Dolne Partie • Atlas Gym",
    done: false,
    now: false,
  },
];

export default function TrainerPage() {
  const featuredTrainer = trainers[0];

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <div className="hidden md:block">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-label text-primary-light">Trainer Management</p>
            <h1 className="mt-2 font-display text-4xl leading-tight text-on-surface">
              Profil Trenera
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-14 min-w-[280px] items-center rounded-full bg-surface-container-lowest px-4 text-on-surface-muted shadow-soft">
              <Search size={18} />
              <input
                type="text"
                placeholder="Szukaj trenera..."
                className="ml-3 w-full bg-transparent text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none"
              />
            </div>

            <Button variant="secondary" icon={<Plus size={16} />}>
              Dodaj Trenera
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] bg-surface-container p-7 shadow-soft">
          <div className="flex items-start justify-between gap-8">
            <div className="flex gap-6">
              <div className="relative">
                <div className="flex h-40 w-40 items-center justify-center rounded-[2rem] border border-secondary/20 bg-surface-container-lowest">
                  <div className="h-24 w-24 rounded-full bg-primary/10" />
                </div>
                <div className="absolute bottom-3 right-[-6px] flex h-10 w-10 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
                  <ShieldCheck size={18} />
                </div>
              </div>

              <div className="pt-1">
                <h2 className="font-display text-5xl leading-[0.95] text-on-surface">
                  {featuredTrainer.name}
                </h2>
                <p className="mt-2 text-label text-primary-light">
                  {featuredTrainer.role}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
                    <Mail size={16} className="text-primary-light" />
                    {featuredTrainer.email}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
                    <Phone size={16} className="text-primary-light" />
                    {featuredTrainer.phone}
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-10 border-t border-secondary/15 pt-7">
                  <div>
                    <p className="text-label text-on-surface-muted">Sesje</p>
                    <p className="mt-2 text-5xl font-semibold text-on-surface">
                      {featuredTrainer.sessions.toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <div>
                    <p className="text-label text-on-surface-muted">Ocena</p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-5xl font-semibold text-on-surface">
                        {featuredTrainer.rating}
                      </p>
                      <Star size={18} className="fill-tertiary text-tertiary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-label text-on-surface-muted">
                      Doświadczenie
                    </p>
                    <p className="mt-2 text-5xl font-semibold text-on-surface">
                      {featuredTrainer.experience}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-w-[220px] flex-col gap-4">
              <Button
                className="h-16 justify-center text-base"
                icon={<Pencil size={18} />}
              >
                Edytuj Profil
              </Button>
              <Button
                variant="secondary"
                className="h-16 justify-center text-base"
              >
                Wyślij Raport
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[1.35fr_0.95fr] gap-8">
          <div className="rounded-[2rem] bg-surface-container p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-on-surface">
                  Aktywni Klienci
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Obecnie pod opieką: {featuredTrainer.activeClients} osoby
                </p>
              </div>

              <Link
                href="/clients"
                className="text-headline-sm text-primary-light"
              >
                Zobacz wszystkich →
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {clients.map((client) => (
                <div
                  key={client.name}
                  className="flex items-center gap-4 rounded-[1.4rem] bg-surface-container-lowest px-4 py-4"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary-light">
                    <UsersIcon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold text-on-surface">
                      {client.name}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {client.goal}
                    </p>
                  </div>

                  <div className="min-w-[140px]">
                    <p className="text-right font-semibold text-tertiary-light">
                      {client.progress}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-container">
                      <div className="h-1.5 w-2/3 rounded-full bg-tertiary" />
                    </div>
                  </div>

                  <button className="text-on-surface-variant transition hover:text-on-surface">
                    <ChevronRight size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-2xl text-on-surface">
                  Dzisiejszy Grafik
                </h3>
              </div>
              <div className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-primary-light">
                14 Maj
              </div>
            </div>

            <div className="mt-8 space-y-6">
              {schedule.map((item) => (
                <div key={`${item.time}-${item.name}`} className="flex gap-4">
                  <div className="w-[72px] pt-1 text-sm font-semibold text-on-surface-variant">
                    {item.time}
                  </div>

                  <div className="relative flex w-6 justify-center">
                    <div className="mt-2 h-3 w-3 rounded-full border border-primary-light/40 bg-surface" />
                    <div className="absolute top-5 h-[94px] w-px bg-secondary/40" />
                  </div>

                  <div
                    className={[
                      "flex-1 rounded-[1.6rem] px-5 py-4",
                      item.now
                        ? "bg-primary text-on-primary shadow-[0_18px_40px_rgba(0,82,255,0.35)]"
                        : "bg-surface-container-lowest",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold">{item.name}</p>
                        <p
                          className={
                            item.now
                              ? "mt-1 text-on-primary-container"
                              : "mt-1 text-on-surface-variant"
                          }
                        >
                          {item.details}
                        </p>
                      </div>

                      {item.done && (
                        <span className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-on-tertiary-container">
                          Zrobione
                        </span>
                      )}

                      {item.now && (
                        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-primary-container">
                          Teraz
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-8 flex h-16 w-full items-center justify-center rounded-full border border-secondary/30 text-lg font-medium text-primary-light transition hover:bg-surface-container-low">
              Otwórz pełny kalendarz
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[1.3fr_0.7fr_0.7fr] gap-8">
          <div className="rounded-[2rem] bg-surface-container p-8 shadow-soft">
            <p className="text-label text-tertiary-light">
              Performance Insight
            </p>
            <h3 className="mt-4 max-w-[640px] font-display text-5xl leading-tight text-on-surface">
              Wzrost retencji klientów o 15% w tym miesiącu.
            </h3>
            <p className="mt-5 max-w-[620px] text-2xl leading-relaxed text-on-surface-variant">
              {featuredTrainer.name.split(" ")[0]} utrzymuje jeden z najwyższych
              wskaźników lojalności klientów w Atlas Studio dzięki
              personalizowanemu podejściu.
            </p>
          </div>

          <div className="rounded-[2rem] bg-surface-container p-8 shadow-soft">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Dumbbell size={30} className="text-primary-light" />
              <p className="mt-10 text-5xl font-semibold text-on-surface">
                {featuredTrainer.plans}
              </p>
              <p className="mt-3 text-label text-on-surface-variant">
                Plany Treningowe
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container p-8 shadow-soft">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <BadgeCheck size={30} className="text-tertiary-light" />
              <p className="mt-10 text-5xl font-semibold text-on-surface">
                {featuredTrainer.certifications}
              </p>
              <p className="mt-3 text-label text-on-surface-variant">
                Certyfikaty Pro
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="px-1">
          <div className="flex items-center justify-between">
            <Link
              href="/trainers"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-primary-light"
            >
              <ChevronRight className="rotate-180" size={20} />
            </Link>

            <h1 className="font-display text-2xl text-on-surface">
              Profil Trenera
            </h1>

            <div className="w-10" />
          </div>

          <div className="mt-8 flex gap-4">
            <div className="relative">
              <div className="flex h-44 w-44 items-center justify-center rounded-[2rem] border border-primary/30 bg-surface-container-lowest">
                <div className="h-24 w-24 rounded-full bg-primary/10" />
              </div>

              <div className="absolute bottom-[-10px] right-[-8px] rounded-full bg-tertiary px-5 py-2 text-sm font-semibold text-on-tertiary">
                PRO
              </div>
            </div>

            <div className="flex-1 pt-1">
              <h2 className="font-display text-[3rem] leading-[0.95] text-on-surface">
                Marek
                <br />
                Kowalski
              </h2>
              <p className="mt-4 text-[0.95rem] uppercase tracking-[0.08em] text-primary-light">
                Personal Performance
                <br />
                Coach
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-[1.7rem] bg-surface-container p-5 shadow-soft">
              <p className="text-label text-on-surface-variant">
                Klienci aktywni
              </p>
              <p className="mt-5 text-6xl font-semibold text-on-surface">24</p>
            </div>

            <div className="rounded-[1.7rem] bg-surface-container p-5 shadow-soft">
              <p className="text-label text-on-surface-variant">Skuteczność</p>
              <p className="mt-5 text-6xl font-semibold text-on-surface">94%</p>
            </div>
          </div>

          <div className="mt-10 flex items-end justify-between gap-4">
            <h3 className="font-display text-4xl leading-tight text-on-surface">
              Najbliższe sesje
            </h3>
            <Link href="/schedule" className="text-label text-primary-light">
              Zobacz grafik
            </Link>
          </div>

          <div className="mt-6 space-y-5">
            {[
              {
                date: "08\nWRZ",
                title: "Trening Siłowy",
                person: "Ania Wiśniewska • 16:30",
              },
              {
                date: "08\nWRZ",
                title: "HIIT Cardio",
                person: "Tomasz Nowak • 18:00",
              },
            ].map((session) => (
              <div
                key={session.title}
                className="flex items-center justify-between rounded-[1.8rem] bg-surface-container px-5 py-5"
              >
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-[1.2rem] bg-surface-container-lowest">
                    <span className="text-4xl font-semibold leading-none text-on-surface">
                      08
                    </span>
                    <span className="mt-1 text-sm uppercase tracking-[0.06em] text-on-surface-variant">
                      WRZ
                    </span>
                  </div>

                  <div>
                    <p className="text-3xl font-semibold text-on-surface">
                      {session.title}
                    </p>
                    <p className="mt-2 text-xl text-on-surface-variant">
                      {session.person}
                    </p>
                  </div>
                </div>

                <div className="h-4 w-4 rounded-full bg-primary-light/60" />
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-end justify-between gap-4">
            <h3 className="font-display text-4xl leading-tight text-on-surface">
              Aktywni Klienci
            </h3>
            <button className="text-on-surface">
              <Search size={28} />
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {[
              {
                name: "Ania Wiśniewska",
                badge: "+12% Postęp",
                badgeClass: "bg-tertiary-container text-on-tertiary-container",
              },
              {
                name: "Tomasz Nowak",
                badge: "Redukcja",
                badgeClass: "bg-primary-container text-on-primary-container",
              },
              {
                name: "Julia Kaczmarek",
                badge: "Siła",
                badgeClass: "bg-tertiary-container text-on-tertiary-container",
              },
            ].map((client) => (
              <div
                key={client.name}
                className="flex items-center justify-between rounded-[1.8rem] bg-surface-container px-5 py-5"
              >
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-full bg-surface-container-lowest" />
                  <div>
                    <p className="text-3xl font-semibold text-on-surface">
                      {client.name}
                    </p>
                    <span
                      className={[
                        "mt-3 inline-flex rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.05em]",
                        client.badgeClass,
                      ].join(" ")}
                    >
                      {client.badge}
                    </span>
                  </div>
                </div>

                <button className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-bright text-on-surface-variant">
                  <ChevronRight size={22} />
                </button>
              </div>
            ))}
          </div>

          <div className="h-28" />
        </div>

        <button className="fixed bottom-6 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_16px_36px_rgba(0,82,255,0.4)]">
          <Pencil size={22} />
        </button>
      </div>
    </div>
  );
}

function UsersIcon() {
  return <div className="h-7 w-7 rounded-full bg-primary-light/60" />;
}
