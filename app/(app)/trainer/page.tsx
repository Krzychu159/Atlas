"use client";

import { userMessage } from "@/app/lib/user-messages";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import { showAppError } from "@/app/components/ui/app-toast";
import DashboardStatCard from "@/app/(app)/owner/components/DashboardStatCard";
import { ApiError, isForbiddenError } from "@/app/lib/backend";
import {
  getTrainerPortalDashboard,
  getTrainerPortalSettlement,
  type TrainerPortalClient,
  type TrainerPortalDashboard,
  type TrainerPortalSession,
  type TrainerPortalSettlement,
} from "@/app/lib/trainer/portal";
import {
  formatSettlementMoney,
  getCurrentTrainerMonth,
  getSettlementErrorMessage,
  getSettlementPaymentLabel,
  parseTrainerMonth,
} from "@/app/lib/trainer/settlement-display";

export default function TrainerDashboardPage() {
  const [dashboard, setDashboard] = useState<TrainerPortalDashboard | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth] = useState(getCurrentTrainerMonth);
  const [settlement, setSettlement] = useState<TrainerPortalSettlement | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(true);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [settlementAttempt, setSettlementAttempt] = useState(0);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      setLoadError(null);
      const dashboardData = await getTrainerPortalDashboard();

      setDashboard(dashboardData);
    } catch (err) {
      const message = isForbiddenError(err)
        ? "Nie masz uprawnień do przeglądania panelu trenera."
        : err instanceof ApiError && err.status === 401
          ? "Sesja wygasła. Zaloguj się ponownie."
          : "Nie udało się pobrać panelu trenera. Spróbuj ponownie.";
      setLoadError(message);
      showAppError(new Error(message), message, {
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

  useEffect(() => {
    let active = true;
    const period = parseTrainerMonth(currentMonth);
    if (!period) return;
    const { year, month } = period;
    async function loadSettlement() {
      setSettlementLoading(true);
      setSettlementError(null);
      try {
        const data = await getTrainerPortalSettlement(year, month);
        if (active) setSettlement(data);
      } catch (err) {
        if (active) {
          setSettlement(null);
          setSettlementError(getSettlementErrorMessage(err));
        }
      } finally {
        if (active) setSettlementLoading(false);
      }
    }
    void loadSettlement();
    return () => { active = false; };
  }, [currentMonth, settlementAttempt]);

  const todaySessions = useMemo(
    () =>
      [...(dashboard?.todaySessions || [])]
        .sort(sortSessionsByStart)
        .slice(0, 8),
    [dashboard],
  );
  const recentClients = useMemo(
    () =>
      [...(dashboard?.recentClients || [])]
        .sort(sortClientsByCreatedAt)
        .slice(0, 8),
    [dashboard],
  );
  const upcomingSessions = useMemo(
    () => [...(dashboard?.upcomingSessions || [])]
      .sort(sortSessionsByStart)
      .slice(0, 8),
    [dashboard],
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

      {loadError ? (
        <div role="alert" className="card-shell p-5 text-on-surface-variant">
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadDashboard()} disabled={isLoading} className="mt-3 text-sm font-semibold text-primary-light disabled:opacity-50">
            Spróbuj ponownie
          </button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 [&_p]:break-words">
        <StatCard
          label="Dzisiejsze sesje"
          value={dashboard?.todaySessionsCount ?? "Niedostępne"}
          note="Sesje na dziś"
          icon={<CalendarDays size={20} />}
          loading={isLoading}
        />
        <StatCard
          label="Aktywni klienci"
          value={dashboard?.activeClientsCount ?? "Niedostępne"}
          note="Twoi podopieczni"
          icon={<Users size={20} />}
          loading={isLoading}
        />
        <div className="min-w-0">
          <StatCard
            label="Rozliczenie miesiąca"
            value={settlementError ? "Niedostępne" : settlement ? formatSettlementMoney(settlement.totalAmount) : "Brak danych"}
            note={settlementError || (settlement ? getSettlementPaymentLabel(settlement.isPaid) : "Brak danych rozliczenia")}
            icon={<Wallet size={20} />}
            loading={settlementLoading}
          />
          <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-primary-light">
            <Link href="/trainer/settlements">Moje rozliczenia <ArrowRight size={14} className="inline" /></Link>
            {settlementError ? (
              <button type="button" onClick={() => setSettlementAttempt((value) => value + 1)} disabled={settlementLoading} className="disabled:opacity-50">Spróbuj ponownie</button>
            ) : null}
          </div>
        </div>
        <StatCard
          label="Nadchodzące sesje"
          value={dashboard?.upcomingSessionsCount ?? "Niedostępne"}
          note="W Twoim planie"
          icon={<Clock3 size={20} />}
          loading={isLoading}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <SessionsPanel
            title="Dzisiejszy plan"
            subtitle="Sesje z Twojego planu na dziś."
            emptyLabel="Brak sesji zaplanowanych na dziś."
            sessions={todaySessions}
            loading={isLoading}
            error={!dashboard && loadError ? loadError : null}
          />
          <SessionsPanel
            title="Nadchodzące sesje"
            subtitle="Najbliższe terminy w Twoim kalendarzu."
            emptyLabel="Brak nadchodzących sesji."
            sessions={upcomingSessions}
            loading={isLoading}
            showDate
            error={!dashboard && loadError ? loadError : null}
          />
        </div>
        <RecentClientsPanel clients={recentClients} loading={isLoading} error={!dashboard && loadError ? loadError : null} />
      </section>

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

function StatCard({ label, value, note, icon, loading }: {
  label: string;
  value: number | string;
  note: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  if (loading) {
    return (
      <article className="card-shell min-h-[132px] p-5" role="status" aria-label={`Ładowanie: ${label}`}>
        <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
          <div className="h-3 w-28 rounded bg-surface-container-high" />
          <div className="mt-4 h-9 w-24 rounded bg-surface-container-high" />
          <div className="mt-4 h-3 w-36 rounded bg-surface-container-high" />
        </div>
      </article>
    );
  }
  return <DashboardStatCard label={label} value={value} note={note} icon={icon} />;
}

function SessionsPanel({ title, subtitle, emptyLabel, sessions, loading, error, showDate = false }: {
  title: string;
  subtitle: string;
  emptyLabel: string;
  sessions: TrainerPortalSession[];
  loading: boolean;
  error: string | null;
  showDate?: boolean;
}) {
  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">{title}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {subtitle}
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
          <PanelSkeleton label="Ładowanie sesji" />
        ) : error ? (
          <EmptyState label="Sesje są chwilowo niedostępne." />
        ) : sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionRow key={session.sessionId} session={session} showDate={showDate} />
          ))
        ) : (
          <EmptyState label={emptyLabel} />
        )}
      </div>
    </section>
  );
}

function SessionRow({ session, showDate }: { session: TrainerPortalSession; showDate: boolean }) {
  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-light">
            {showDate ? `${formatSessionDate(session.startAt)} · ` : ""}
            {formatTimeRange(session.startAt, session.endAt)}
          </p>
          <p className="mt-2 truncate text-lg font-semibold text-on-surface">
            {session.title || "Sesja treningowa"}
          </p>
          {session.clientFullName ? (
            <p className="mt-1 break-words text-sm text-on-surface-variant">
              {session.clientFullName}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 sm:text-right">
          <StatusPill label={getSessionStatusLabel(session.status)} />
          {session.locationName ? (
            <p className="mt-3 flex items-center gap-1 text-xs text-on-surface-muted sm:justify-end">
              <MapPin size={13} />
              {session.locationName}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RecentClientsPanel({
  clients,
  loading,
  error,
}: {
  clients: TrainerPortalClient[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Ostatni klienci</p>
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
          <PanelSkeleton label="Ładowanie klientów" />
        ) : error ? (
          <EmptyState label="Lista klientów jest chwilowo niedostępna." />
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
    <Link href={`/trainer/clients/${client.clientId}`} prefetch={false} className="block rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-4 transition hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary-light">
      <div className="flex flex-wrap items-center gap-3">
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
    </Link>
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

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="animate-pulse rounded-[var(--radius-lg)] bg-surface-container-low p-4 motion-reduce:animate-none" aria-hidden="true">
          <div className="h-4 w-24 rounded bg-surface-container-high" />
          <div className="mt-3 h-5 w-2/3 rounded bg-surface-container-high" />
          <div className="mt-3 h-3 w-1/2 rounded bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
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
  const labels: Record<string, string> = {
    planned: "Zaplanowana", scheduled: "Zaplanowana", confirmed: "Potwierdzona",
    cancelled: "Anulowana", canceled: "Anulowana", completed: "Zrealizowana",
    done: "Zrealizowana", active: "Aktywna", inprogress: "W trakcie",
  };
  return labels[normalize(status || "")] || userMessage(status, "Status niedostępny");
}

function getClientStatusLabel(status?: string | null) {
  const normalized = normalize(status || "");

  if (normalized === "active") return "Aktywny";
  if (normalized === "inactive") return "Nieaktywny";
  if (normalized === "cancelled") return "Zakończony";

  return userMessage(status, "Status niedostępny");
}

function getBillingStatusLabel(status?: string | null) {
  const normalized = normalize(status || "");

  if (normalized === "paid") return "Opłacone";
  if (normalized === "pending") return "Oczekuje";
  if (normalized === "pendingpayment") return "Do zapłaty";
  if (normalized === "overdue") return "Zaległość";

  return status ? userMessage(status, "Status płatności niedostępny") : "";
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
  if (!value || Number.isNaN(new Date(value).getTime())) return "Brak godziny";
  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}

function formatSessionDate(value: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Brak daty";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}
