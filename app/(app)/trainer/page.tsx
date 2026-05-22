"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { showAppError } from "@/app/components/ui/app-toast";
import {
  getTrainerPortalClients,
  getTrainerPortalDashboard,
  type TrainerPortalClient,
  type TrainerPortalDashboard,
  type TrainerPortalSession,
} from "@/app/lib/trainer/portal";

export default function TrainerDashboardPage() {
  const [dashboard, setDashboard] = useState<TrainerPortalDashboard | null>(
    null,
  );
  const [clients, setClients] = useState<TrainerPortalClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      const [dashboardData, clientsData] = await Promise.all([
        getTrainerPortalDashboard(),
        getTrainerPortalClients(),
      ]);

      setDashboard(dashboardData);
      setClients(clientsData);
    } catch (err) {
      showAppError(err, "Nie udało się pobrać panelu trenera.", {
        id: "trainer-dashboard-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const todaySessions = useMemo(
    () =>
      [...(dashboard?.todaySessions || [])]
        .sort(sortSessionsByStart)
        .slice(0, 3),
    [dashboard],
  );
  const recentClients = useMemo(
    () =>
      [
        ...(dashboard?.recentClients?.length
          ? dashboard.recentClients
          : clients),
      ]
        .sort(sortClientsByCreatedAt)
        .slice(0, 3),
    [clients, dashboard],
  );
  const upcomingSessions = useMemo(
    () => [...(dashboard?.upcomingSessions || [])].sort(sortSessionsByStart),
    [dashboard],
  );
  const focus = useMemo(
    () => getTrainerFocus(clients, upcomingSessions),
    [clients, upcomingSessions],
  );
  const firstName = getFirstName(dashboard?.me?.fullName);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel trenera</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Cześć{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Szybki przegląd dnia: najbliższe sesje, nowi podopieczni i rzeczy,
            które warto sprawdzić przed treningami.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <DashboardLink href="/trainer/schedule" icon={<CalendarDays size={16} />}>
            Otwórz plan
          </DashboardLink>
          <DashboardLink href="/trainer/clients" icon={<Users size={16} />}>
            Klienci
          </DashboardLink>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Dzisiejsze sesje"
          value={dashboard?.todaySessionsCount ?? 0}
          note="Zaplanowane na dziś"
          icon={<CalendarDays size={20} />}
          loading={isLoading}
        />
        <StatCard
          label="Aktywni klienci"
          value={dashboard?.activeClientsCount ?? clients.length}
          note="Twoi podopieczni"
          icon={<Users size={20} />}
          loading={isLoading}
        />
        <StatCard
          label="Najbliższe sesje"
          value={dashboard?.upcomingSessionsCount ?? 0}
          note="W kolejce planu"
          icon={<Clock3 size={20} />}
          loading={isLoading}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <TodaySessionsPanel sessions={todaySessions} loading={isLoading} />
        <RecentClientsPanel clients={recentClients} loading={isLoading} />
      </section>

      <CoachFocusPanel focus={focus} loading={isLoading} />
    </div>
  );
}

function DashboardLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-primary-light transition hover:bg-surface-container-high"
    >
      {icon}
      {children}
    </Link>
  );
}

function StatCard({
  label,
  value,
  note,
  icon,
  loading,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <article className="card-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label text-on-surface-muted">{label}</p>
          <p className="mt-4 text-[2.1rem] font-semibold leading-none text-on-surface">
            {loading ? "..." : value}
          </p>
          <p className="mt-3 text-sm text-on-surface-variant">{note}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
          {icon}
        </div>
      </div>
    </article>
  );
}

function TodaySessionsPanel({
  sessions,
  loading,
}: {
  sessions: TrainerPortalSession[];
  loading: boolean;
}) {
  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Dzisiejsze sesje</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Trzy najbliższe pozycje z Twojego planu dnia.
          </p>
        </div>
        <Link
          href="/trainer/schedule"
          className="inline-flex items-center gap-1 text-label text-primary-light"
        >
          Plan
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {loading ? (
          <EmptyState label="Ładowanie sesji..." />
        ) : sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionRow key={session.sessionId} session={session} />
          ))
        ) : (
          <EmptyState label="Brak sesji zaplanowanych na dziś." />
        )}
      </div>
    </section>
  );
}

function SessionRow({ session }: { session: TrainerPortalSession }) {
  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-light">
            {formatTimeRange(session.startAt, session.endAt)}
          </p>
          <p className="mt-2 truncate text-lg font-semibold text-on-surface">
            {session.title || "Sesja treningowa"}
          </p>
          <p className="mt-1 truncate text-sm text-on-surface-variant">
            {session.clientFullName || "Klient bez nazwy"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <StatusPill label={getSessionStatusLabel(session.status)} />
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-on-surface-muted">
            <MapPin size={13} />
            {session.locationName || "Brak lokalizacji"}
          </p>
        </div>
      </div>
    </article>
  );
}

function RecentClientsPanel({
  clients,
  loading,
}: {
  clients: TrainerPortalClient[];
  loading: boolean;
}) {
  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Nowi podopieczni</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Ostatnio przypisani klienci i podstawowe informacje.
          </p>
        </div>
        <Link
          href="/trainer/clients"
          className="inline-flex items-center gap-1 text-label text-primary-light"
        >
          Wszyscy
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {loading ? (
          <EmptyState label="Ładowanie klientów..." />
        ) : clients.length > 0 ? (
          clients.map((client) => (
            <ClientRow key={client.clientId} client={client} />
          ))
        ) : (
          <EmptyState label="Nie masz jeszcze przypisanych klientów." />
        )}
      </div>
    </section>
  );
}

function ClientRow({ client }: { client: TrainerPortalClient }) {
  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-lowest text-sm font-semibold text-primary-light">
          {client.avatarUrl ? (
            <img
              src={client.avatarUrl}
              alt={client.fullName || "Klient"}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(client.fullName)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-on-surface">
            {client.fullName || `Klient #${client.clientId}`}
          </p>
          <p className="mt-1 truncate text-sm text-on-surface-variant">
            {client.goal || "Cel nieuzupełniony"}
          </p>
        </div>
        <StatusPill label={getClientStatusLabel(client.status)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-muted">
        <span>{client.locationName || "Brak lokalizacji"}</span>
        {client.billingStatus ? (
          <span>{getBillingStatusLabel(client.billingStatus)}</span>
        ) : null}
      </div>
    </article>
  );
}

type CoachFocus = {
  nextSession: TrainerPortalSession | null;
  newClientsCount: number;
  missingGoalCount: number;
};

function CoachFocusPanel({
  focus,
  loading,
}: {
  focus: CoachFocus;
  loading: boolean;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <FocusCard
        label="Następna sesja"
        value={
          focus.nextSession
            ? formatTimeRange(focus.nextSession.startAt, focus.nextSession.endAt)
            : "Brak"
        }
        note={focus.nextSession?.clientFullName || "Najbliższy trening"}
        icon={<Clock3 size={20} />}
        loading={loading}
      />
      <FocusCard
        label="Nowi w 14 dni"
        value={String(focus.newClientsCount)}
        note="Klienci, których warto wdrożyć"
        icon={<Sparkles size={20} />}
        loading={loading}
      />
      <FocusCard
        label="Do uzupełnienia"
        value={String(focus.missingGoalCount)}
        note="Klienci bez celu treningowego"
        icon={<Target size={20} />}
        loading={loading}
      />
    </section>
  );
}

function FocusCard({
  label,
  value,
  note,
  icon,
  loading,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <article className="card-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label text-on-surface-muted">{label}</p>
          <p className="mt-4 truncate text-2xl font-semibold text-on-surface">
            {loading ? "..." : value}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">{note}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-primary-light">
          {icon}
        </div>
      </div>
    </article>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-light">
      {label}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
      {label}
    </div>
  );
}

function getTrainerFocus(
  clients: TrainerPortalClient[],
  upcomingSessions: TrainerPortalSession[],
): CoachFocus {
  const now = Date.now();
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  return {
    nextSession: upcomingSessions[0] || null,
    newClientsCount: clients.filter(
      (client) => new Date(client.createdAt).getTime() >= twoWeeksAgo,
    ).length,
    missingGoalCount: clients.filter((client) => !client.goal?.trim()).length,
  };
}

function sortSessionsByStart(
  first: TrainerPortalSession,
  second: TrainerPortalSession,
) {
  return new Date(first.startAt).getTime() - new Date(second.startAt).getTime();
}

function sortClientsByCreatedAt(
  first: TrainerPortalClient,
  second: TrainerPortalClient,
) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

function getFirstName(name?: string | null) {
  return name?.trim().split(" ")[0] || "";
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function getSessionStatusLabel(status?: string | null) {
  const normalized = normalize(status || "");

  if (normalized.includes("cancel")) return "Anulowana";
  if (normalized.includes("complete") || normalized.includes("done")) {
    return "Zrealizowana";
  }
  if (normalized.includes("active")) return "Aktywna";

  return "Zaplanowana";
}

function getClientStatusLabel(status?: string | null) {
  const normalized = normalize(status || "");

  if (normalized === "active") return "Aktywny";
  if (normalized === "inactive") return "Nieaktywny";
  if (normalized === "cancelled") return "Zakończony";

  return status || "Aktywny";
}

function getBillingStatusLabel(status?: string | null) {
  const normalized = normalize(status || "");

  if (normalized === "paid") return "Opłacone";
  if (normalized === "pending") return "Oczekuje";
  if (normalized === "pendingpayment") return "Do zapłaty";
  if (normalized === "overdue") return "Zaległość";

  return status || "";
}

function getInitials(name?: string | null) {
  const initials = (name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "K";
}

function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
