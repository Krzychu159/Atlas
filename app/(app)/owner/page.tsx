"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Dumbbell, Package, Plus, Users } from "lucide-react";
import {
  getOwnerDashboard,
  type OwnerDashboard,
  type OwnerSession,
  type RecentClient,
} from "@/app/lib/owner/dashboard";
import DashboardStatCard from "./components/DashboardStatCard";
import DashboardSessionsSection from "./components/DashboardSessionsSection";
import DashboardClientRow from "./components/DashboardClientRow";
import DashboardRevenueCard from "./components/DashboardRevenueCard";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError("");
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
      {/* Desktop */}
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
                <DashboardStatCard
                  label="Trenerzy"
                  value={dashboard.trainersCount}
                  note="Aktywni w systemie"
                  icon={<Dumbbell size={54} />}
                  accent="success"
                />

                <DashboardStatCard
                  label="Aktywni klienci"
                  value={dashboard.activeClientsCount}
                  note="Baza klientów"
                  icon={<Users size={54} />}
                  accent="success"
                />

                <DashboardStatCard
                  label="Sesje dzisiaj"
                  value={dashboard.plannedSessionsCount}
                  note="Zaplanowane sesje"
                  icon={<CalendarDays size={54} />}
                  accent="primary"
                />

                <DashboardStatCard
                  label="Pakiety"
                  value={dashboard.activePackagesCount}
                  note="Aktywne pakiety"
                  icon={<Package size={54} />}
                  accent="success"
                />
              </div>

              <div className="grid grid-cols-[1fr_310px] gap-4 items-start">
                <div className="flex flex-col gap-5">
                  <DashboardSessionsSection
                    title="Dzisiejsze sesje"
                    subtitle="Maksymalnie 3 najbliższe pozycje"
                    sessions={todaySessions}
                    limit={3}
                  />

                  <DashboardSessionsSection
                    title="Jutrzejsze sesje"
                    subtitle="Maksymalnie 2 najbliższe pozycje"
                    sessions={tomorrowSessions}
                    muted
                    limit={2}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <DashboardRevenueCard />

                  <div className="card-shell p-6">
                    <p className="text-section-title">Najnowsi klienci</p>

                    <div className="mt-5 flex flex-col gap-5">
                      {recentClients.length > 0 ? (
                        recentClients
                          .slice(0, 3)
                          .map((client: RecentClient, index: number) => (
                            <DashboardClientRow
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

      {/* Mobile */}
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
                <DashboardStatCard
                  label="Trenerzy"
                  value={dashboard.trainersCount}
                  note="Aktywni"
                  icon={<Dumbbell size={42} />}
                  accent="primary"
                />

                <DashboardStatCard
                  label="Aktywni klienci"
                  value={dashboard.activeClientsCount}
                  note="Klienci"
                  icon={<Users size={42} />}
                />

                <DashboardStatCard
                  label="Zaplanowane sesje"
                  value={dashboard.plannedSessionsCount}
                  note="Dzisiaj"
                  icon={<CalendarDays size={42} />}
                  accent="success"
                />

                <DashboardStatCard
                  label="Aktywne pakiety"
                  value={dashboard.activePackagesCount}
                  note="Pakiety"
                  icon={<Package size={42} />}
                />
              </div>

              <DashboardSessionsSection
                title="Dzisiejsze sesje"
                subtitle="3 najbliższe pozycje"
                sessions={todaySessions}
              />

              <DashboardSessionsSection
                title="Jutrzejsze sesje"
                subtitle="3 najbliższe pozycje"
                sessions={tomorrowSessions}
                muted
              />

              <DashboardRevenueCard />

              <section>
                <p className="text-label text-on-surface">Najnowsi klienci</p>

                <div className="mt-4 flex flex-col gap-3">
                  {recentClients.length > 0 ? (
                    recentClients
                      .slice(0, 3)
                      .map((client: RecentClient, index: number) => (
                        <DashboardClientRow
                          key={client.id ?? index}
                          client={client}
                          mobile
                        />
                      ))
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
