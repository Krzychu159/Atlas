"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Dumbbell,
  MoreVertical,
  Package,
  Plus,
  Users,
  Zap,
} from "lucide-react";
import {
  getOwnerDashboard,
  type OwnerDashboard,
  type OwnerSession,
  type RecentClient,
} from "../../lib/owner/dashboard";
function getSessionTitle(session: OwnerSession) {
  return (
    session.title || session.sessionName || session.name || "Sesja treningowa"
  );
}

function getSessionTrainer(session: OwnerSession) {
  return session.trainerName || session.trainer || "Trener";
}

function getSessionClient(session: OwnerSession) {
  return session.clientName || session.client;
}

function getSessionTime(session: OwnerSession) {
  return session.startTime || session.time || session.hour || "--:--";
}

function getSessionDuration(session: OwnerSession) {
  return session.durationMinutes || session.duration || 60;
}

function getClientName(client: RecentClient) {
  return client.fullName || client.name || "Klient";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatCard({
  label,
  value,
  note,
  icon,
  accent = "neutral",
}: {
  label: string;
  value: number | string;
  note: string;
  icon: React.ReactNode;
  accent?: "neutral" | "primary" | "success";
}) {
  return (
    <div
      className={`card-shell p-5 min-h-[132px] relative overflow-hidden ${
        accent === "primary" ? "border-b-2 border-primary" : ""
      }`}
    >
      <div className="absolute right-5 top-5 text-on-surface-muted/15">
        {icon}
      </div>

      <p className="text-label text-on-surface-variant">{label}</p>
      <p className="mt-3 text-[2.25rem] leading-none font-semibold tracking-tight">
        {value}
      </p>
      <p
        className={`mt-4 text-sm font-semibold ${
          accent === "success" ? "text-tertiary-light" : "text-primary-light"
        }`}
      >
        {note}
      </p>
    </div>
  );
}

function SessionRow({
  session,
  compact = false,
}: {
  session: OwnerSession;
  compact?: boolean;
}) {
  const client = getSessionClient(session);
  const status = session.status || "Zaplanowane";

  return (
    <div className="bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-[78px] shrink-0">
          <p className="text-[1.35rem] leading-none font-semibold">
            {getSessionTime(session)}
          </p>
          {!compact ? (
            <p className="text-label text-on-surface-muted mt-2">
              {getSessionDuration(session)} min
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-base font-semibold truncate">
            {getSessionTitle(session)}
          </p>
          <p className="text-sm text-on-surface-variant truncate mt-1">
            Trener: {getSessionTrainer(session)}
            {client ? ` • ${client}` : ""}
          </p>
        </div>
      </div>

      {!compact ? (
        <span
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 ${
            status.toLowerCase().includes("trakcie")
              ? "bg-primary/25 text-primary-light"
              : status.toLowerCase().includes("oczek")
                ? "bg-surface-container-high text-on-surface-variant"
                : "bg-tertiary-container text-tertiary-light"
          }`}
        >
          {status}
        </span>
      ) : (
        <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
      )}
    </div>
  );
}

function ClientRow({ client }: { client: RecentClient }) {
  const name = getClientName(client);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary-light text-sm font-semibold shrink-0">
          {getInitials(name)}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-label text-tertiary-light mt-1">
            {client.activity || client.status || "Aktywny"}
          </p>
        </div>
      </div>

      <p className="text-xs text-on-surface-muted shrink-0">
        {client.createdAt || ""}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getOwnerDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd ładowania danych");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const todaySessions: OwnerSession[] = dashboard?.todaySessions ?? [];
  const tomorrowSessions: OwnerSession[] = dashboard?.tomorrowSessions ?? [];
  const recentClients: RecentClient[] = dashboard?.recentClients ?? [];

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="hidden md:block">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-primary-light">Overview</p>
              <h1 className="mt-2 text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
                Status <span className="text-primary-light">Operacyjny</span>
              </h1>
            </div>

            <div className="text-right">
              <p className="text-label text-on-surface-variant">Operacje</p>
              <p className="text-sm font-semibold">Zarządzanie Studio</p>
            </div>
          </div>

          {isLoading ? (
            <div className="card-shell p-5 text-on-surface-variant">
              Ładowanie danych operacyjnych...
            </div>
          ) : null}

          {error ? (
            <div className="card-shell p-5 text-error-light">{error}</div>
          ) : null}

          {dashboard ? (
            <>
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  label="Trenerzy"
                  value={dashboard.trainersCount}
                  note="Aktywni w systemie"
                  icon={<Dumbbell size={54} />}
                  accent="success"
                />
                <StatCard
                  label="Aktywni klienci"
                  value={dashboard.activeClientsCount}
                  note="Baza klientów"
                  icon={<Users size={54} />}
                  accent="success"
                />
                <StatCard
                  label="Sesje dzisiaj"
                  value={dashboard.plannedSessionsCount}
                  note="Zaplanowane sesje"
                  icon={<CalendarDays size={54} />}
                  accent="primary"
                />
                <StatCard
                  label="Pakiety"
                  value={dashboard.activePackagesCount}
                  note="Aktywne pakiety"
                  icon={<Package size={54} />}
                  accent="success"
                />
              </div>

              <div className="grid grid-cols-[1fr_310px] gap-4 items-start">
                <div className="flex flex-col gap-5">
                  <section>
                    <div className="flex items-end justify-between gap-4">
                      <div className="border-l-4 border-primary-light pl-4">
                        <p className="text-section-title">Dzisiejsze sesje</p>
                        <p className="text-label text-on-surface-variant mt-1">
                          Harmonogram na dziś
                        </p>
                      </div>

                      <Link
                        href="/owner/schedule"
                        className="text-label text-primary-light"
                      >
                        Zobacz wszystkie
                      </Link>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      {todaySessions.length > 0 ? (
                        todaySessions
                          .slice(0, 3)
                          .map((session: OwnerSession, index: number) => (
                            <SessionRow
                              key={session.id ?? index}
                              session={session}
                            />
                          ))
                      ) : (
                        <div className="card-shell p-5 text-on-surface-variant">
                          Brak sesji na dziś.
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="border-l-4 border-on-surface-muted pl-4">
                      <p className="text-section-title text-on-surface-variant">
                        Jutrzejsze sesje
                      </p>
                      <p className="text-label text-on-surface-muted mt-1">
                        Nadchodzący harmonogram
                      </p>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      {tomorrowSessions.length > 0 ? (
                        tomorrowSessions
                          .slice(0, 2)
                          .map((session: OwnerSession, index: number) => (
                            <SessionRow
                              key={session.id ?? index}
                              session={session}
                              compact
                            />
                          ))
                      ) : (
                        <div className="card-shell p-5 text-on-surface-variant">
                          Brak sesji na jutro.
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="card-shell p-6">
                    <div className="flex items-center gap-3">
                      <Zap size={20} className="text-primary-light" />
                      <p className="text-section-title">Najbliższe treningi</p>
                    </div>

                    <div className="mt-6 flex flex-col gap-4">
                      {todaySessions.length > 0 ? (
                        todaySessions
                          .slice(0, 3)
                          .map((session: OwnerSession, index: number) => (
                            <div
                              key={session.id ?? index}
                              className="flex items-center gap-4"
                            >
                              <div
                                className={`w-12 rounded-[12px] py-3 text-center text-label ${
                                  index === 0
                                    ? "bg-primary text-on-primary"
                                    : "bg-surface-container-low text-on-surface-variant"
                                }`}
                              >
                                {getSessionTime(session)}
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {getSessionTitle(session)}
                                </p>
                                <p className="text-xs text-on-surface-variant mt-1 truncate">
                                  {getSessionTrainer(session)}
                                </p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-on-surface-variant">
                          Brak najbliższych treningów.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="card-shell p-6">
                    <p className="text-section-title">Ostatni klienci</p>

                    <div className="mt-5 flex flex-col gap-5">
                      {recentClients.length > 0 ? (
                        recentClients
                          .slice(0, 3)
                          .map((client: RecentClient, index: number) => (
                            <ClientRow
                              key={client.id ?? index}
                              client={client}
                            />
                          ))
                      ) : (
                        <p className="text-sm text-on-surface-variant">
                          Brak ostatniej aktywności klientów.
                        </p>
                      )}
                    </div>

                    <Link
                      href="/owner/clients"
                      className="mt-6 h-12 rounded-[var(--radius-lg)] bg-surface-container-low flex items-center justify-center text-label text-on-surface"
                    >
                      Przeglądaj bazę klientów
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-label text-primary-light">Panel zarządzania</p>
            <h1 className="mt-2 text-page-title italic">
              Statystyki
              <br />
              <span className="text-primary-light">Obiektu</span>
            </h1>
          </div>

          {isLoading ? (
            <div className="card-shell p-5 text-on-surface-variant">
              Ładowanie danych...
            </div>
          ) : null}

          {error ? (
            <div className="card-shell p-5 text-error-light">{error}</div>
          ) : null}

          {dashboard ? (
            <>
              <div className="flex flex-col gap-4">
                <StatCard
                  label="Trenerzy"
                  value={dashboard.trainersCount}
                  note="Aktywni"
                  icon={<Dumbbell size={42} />}
                  accent="primary"
                />
                <StatCard
                  label="Aktywni klienci"
                  value={dashboard.activeClientsCount}
                  note="Klienci"
                  icon={<Users size={42} />}
                />
                <StatCard
                  label="Zaplanowane sesje"
                  value={dashboard.plannedSessionsCount}
                  note="Dzisiaj"
                  icon={<CalendarDays size={42} />}
                  accent="success"
                />
                <StatCard
                  label="Aktywne pakiety"
                  value={dashboard.activePackagesCount}
                  note="Pakiety"
                  icon={<Package size={42} />}
                />
              </div>

              <section>
                <div className="flex items-center justify-between">
                  <p className="text-section-title">Dzisiejsze sesje</p>
                  <Link
                    href="/schedule"
                    className="text-label text-primary-light"
                  >
                    Zobacz wszystko
                  </Link>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {todaySessions.length > 0 ? (
                    todaySessions
                      .slice(0, 2)
                      .map((session: OwnerSession, index: number) => (
                        <SessionRow
                          key={session.id ?? index}
                          session={session}
                          compact
                        />
                      ))
                  ) : (
                    <div className="card-shell p-5 text-on-surface-variant">
                      Brak sesji na dziś.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <p className="text-section-title">Jutrzejsze sesje</p>

                <div className="mt-4 flex flex-col gap-3">
                  {tomorrowSessions.length > 0 ? (
                    tomorrowSessions
                      .slice(0, 1)
                      .map((session: OwnerSession, index: number) => (
                        <SessionRow
                          key={session.id ?? index}
                          session={session}
                          compact
                        />
                      ))
                  ) : (
                    <div className="card-shell p-5 text-on-surface-variant">
                      Brak sesji na jutro.
                    </div>
                  )}
                </div>
              </section>

              <div className="card-shell p-5">
                <p className="text-label text-primary-light">
                  Najbliższe treningi
                </p>

                <div className="mt-5 flex flex-col gap-4">
                  {todaySessions.length > 0 ? (
                    todaySessions
                      .slice(0, 3)
                      .map((session: OwnerSession, index: number) => (
                        <div
                          key={session.id ?? index}
                          className="flex items-center justify-between gap-4 border-b border-white/5 last:border-0 pb-4 last:pb-0"
                        >
                          <p className="text-tertiary-light font-semibold">
                            {getSessionTime(session)}
                          </p>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {getSessionTitle(session)}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate">
                              {getSessionTrainer(session)}
                            </p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      Brak najbliższych treningów.
                    </p>
                  )}
                </div>
              </div>

              <section>
                <p className="text-label text-on-surface">Ostatni klienci</p>

                <div className="mt-4 flex flex-col gap-3">
                  {recentClients.length > 0 ? (
                    recentClients
                      .slice(0, 3)
                      .map((client: RecentClient, index: number) => {
                        const name = getClientName(client);

                        return (
                          <div
                            key={client.id ?? index}
                            className="bg-surface-container-lowest rounded-[var(--radius-lg)] px-4 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-full bg-surface-container flex items-center justify-center text-primary-light text-sm font-semibold shrink-0">
                                {getInitials(name)}
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {name}
                                </p>
                                <p className="text-label text-tertiary-light">
                                  {client.activity ||
                                    client.status ||
                                    "Aktywna"}
                                </p>
                              </div>
                            </div>

                            <MoreVertical
                              size={16}
                              className="text-on-surface-muted shrink-0"
                            />
                          </div>
                        );
                      })
                  ) : (
                    <div className="card-shell p-5 text-on-surface-variant">
                      Brak ostatnich klientów.
                    </div>
                  )}
                </div>
              </section>

              <button className="fixed right-5 bottom-24 h-16 w-16 rounded-full bg-primary-gradient text-white shadow-ambient flex items-center justify-center z-20">
                <Plus size={28} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
