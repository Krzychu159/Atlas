"use client";

import { userMessage } from "@/app/lib/user-messages";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Users,
  Wallet,
  Plus,
  ReceiptText,
} from "lucide-react";
import { showAppError } from "@/app/components/ui/app-toast";
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
  formatSettlementNumber,
  formatSettlementDate,
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
        .sort(sortSessionsByStart),
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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const nearestSessionId = todaySessions.find(session =>
    Date.parse(session.startAt) >= now && !["cancelled", "canceled", "completed", "done"].includes(normalize(session.status || "")),
  )?.sessionId;
  const sessionError = !dashboard && loadError ? "Zajęcia są chwilowo niedostępne." : null;
  const monthLabel = formatMonth(currentMonth);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-5 pb-8">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-light">Panel trenera</p>
          <h1 className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight">Pulpit trenera</h1>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">Witaj{firstName ? ", " + firstName : ""}. Twój plan pracy, dzisiejsze sesje i aktywni podopieczni.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DashboardLink href="/trainer/schedule" icon={<CalendarDays size={14} />}>Otwórz grafik</DashboardLink>
          <DashboardLink href="/trainer/schedule?action=new" icon={<Plus size={14} />} primary>Dodaj trening</DashboardLink>
        </div>
      </section>
      {loadError ? <div role="alert" className="rounded-xl bg-surface-container-low p-4 text-xs text-on-surface-variant">
        <p>{loadError}</p><button type="button" onClick={() => void loadDashboard()} disabled={isLoading} className="mt-2 font-semibold text-primary-light disabled:opacity-50">Spróbuj ponownie</button>
      </div> : null}
      <section aria-label="Podsumowanie" className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Aktywni klienci" value={dashboard?.activeClientsCount ?? "Niedostępne"} note="Przypisani podopieczni" icon={<Users size={16} />} loading={isLoading} />
        <StatCard label="Dzisiejsze sesje" value={dashboard?.todaySessionsCount ?? "Niedostępne"} note="Zaplanowane na dziś" icon={<CalendarDays size={16} />} loading={isLoading} />
        <StatCard label="Nadchodzące sesje" value={dashboard?.upcomingSessionsCount ?? "Niedostępne"} note="Najbliższe dni" icon={<CalendarDays size={16} />} loading={isLoading} />
        <StatCard label="Wynagrodzenie w tym miesiącu" value={settlementError ? "Niedostępne" : settlement ? formatSettlementMoney(settlement.totalAmount) : "Brak danych"} note={monthLabel} icon={<Wallet size={16} />} loading={settlementLoading} success />
      </section>
      <section className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2.15fr)_minmax(240px,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-xl bg-surface-container-low p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Dzisiejszy plan</h2>
                {!isLoading && !sessionError ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary-light">{sessionCountLabel(todaySessions.length)} dziś</span> : null}
              </div>
              <Link href="/trainer/schedule" className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-light">Przejdź do grafiku <ArrowRight size={12} /></Link>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {isLoading ? <PanelSkeleton label="Ładowanie dzisiejszego planu" /> : sessionError ? <EmptyState label={sessionError} /> : todaySessions.length ? todaySessions.map(session => <TodaySessionRow key={session.sessionId} session={session} nearest={session.sessionId === nearestSessionId} />) : <EmptyState label="Brak zajęć zaplanowanych na dziś." />}
            </div>
          </section>
          <UpcomingSessionsPanel sessions={upcomingSessions} loading={isLoading} error={sessionError} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-xl bg-surface-container-low p-4 lg:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2"><span className="rounded-lg bg-tertiary/10 p-2 text-tertiary-light"><ReceiptText size={16} /></span>
                <div><h2 className="text-xs font-semibold">Moje rozliczenie</h2><p className="mt-1 text-[10px] text-on-surface-muted">{monthLabel}</p></div>
              </div>
              <Link href="/trainer/settlements" className="text-right text-[10px] font-semibold text-primary-light">Zobacz rozliczenie</Link>
            </div>
            {settlementLoading ? <div className="mt-4"><PanelSkeleton label="Ładowanie rozliczenia" /></div> : settlementError ? <div role="alert" className="mt-4 text-xs leading-5 text-on-surface-variant">{settlementError}<button type="button" onClick={() => setSettlementAttempt(value => value + 1)} className="mt-2 block font-semibold text-primary-light">Spróbuj ponownie</button></div> : settlement ? <>
              <div className="mt-4 rounded-lg bg-surface-container p-3"><p className="text-[9px] uppercase tracking-wider text-on-surface-muted">Kwota rozliczenia</p><p className="mt-1 text-xl font-semibold tracking-tight text-tertiary-light">{formatSettlementMoney(settlement.totalAmount)}</p></div>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                <SettlementMetric label="Sesje objęte umową" value={formatSettlementNumber(settlement.contractedTotalSessions)} />
                <SettlementMetric label="Godziny rozliczeniowe" value={typeof settlement.contractedTotalHours === "number" && Number.isFinite(settlement.contractedTotalHours) ? formatSettlementNumber(settlement.contractedTotalHours) + " h" : "Niedostępne"} />
                <div><dt className="text-[9px] leading-4 text-on-surface-muted">Status wypłaty</dt><dd className="mt-1"><StatusPill label={getSettlementPaymentLabel(settlement.isPaid)} tone={settlement.isPaid === true ? "success" : "neutral"} /></dd></div>
              </dl>
              {settlement.isPaid === true && settlement.paidAt ? <p className="mt-3 text-[10px] text-on-surface-muted">Wypłacono: {formatSettlementDate(settlement.paidAt)}</p> : null}
            </> : <div className="mt-4"><EmptyState label="Rozliczenie jest niedostępne." /></div>}
          </section>
          <RecentClientsPanel clients={recentClients} loading={isLoading} error={!dashboard && loadError ? "Lista klientów jest chwilowo niedostępna." : null} />
        </div>
      </section>
    </div>
  );
}

function DashboardLink({ href, icon, children, primary = false }: { href: string; icon: React.ReactNode; children: React.ReactNode; primary?: boolean }) {
  return <Link href={href} className={"inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-primary-light " + (primary ? "bg-primary text-on-primary shadow-soft hover:bg-primary-container" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high")}>{icon}{children}</Link>;
}

function StatCard({ label, value, note, icon, loading, success = false }: { label: string; value: string | number; note: string; icon: React.ReactNode; loading: boolean; success?: boolean }) {
  return <article className="relative min-w-0 rounded-xl bg-surface-container-low p-4" aria-label={label}>
    <div className="flex items-start justify-between gap-2"><p className="max-w-[160px] text-[10px] font-medium uppercase leading-4 tracking-wider text-on-surface-muted">{label}</p><span className={"shrink-0 rounded-lg p-1.5 " + (success ? "bg-tertiary/10 text-tertiary-light" : "bg-surface-container text-primary-light")}>{icon}</span></div>
    {loading ? <div role="status" aria-label={"Ładowanie: " + label} className="mt-3 h-7 w-20 animate-pulse rounded bg-surface-container-high motion-reduce:animate-none" /> : <p className={"mt-2 break-words text-2xl font-semibold leading-8 tracking-tight " + (success ? "text-tertiary-light" : "text-on-surface")}>{value}</p>}
    <p className="mt-1 text-[10px] leading-4 text-on-surface-variant">{note}</p>
  </article>;
}

function TodaySessionRow({ session, nearest }: { session: TrainerPortalSession; nearest: boolean }) {
  return <article className={"grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-3 sm:grid-cols-[48px_minmax(0,1fr)_auto] " + (nearest ? "border-primary-light/20 border-l-2 border-l-primary bg-surface-container" : "border-transparent bg-surface-container-lowest/20")}>
    <div className="border-r border-white/10 pr-2"><p className="text-[11px] font-semibold text-primary-light">{formatTime(session.startAt)}</p><p className="mt-1 text-[9px] text-on-surface-muted">{formatTime(session.endAt)}</p></div>
    <div className="min-w-0"><h3 className="break-words text-xs font-semibold leading-5">{session.title || session.clientFullName || "Sesja treningowa"}</h3>
      {session.clientFullName && session.clientFullName !== session.title ? <p className="break-words text-[10px] leading-4 text-on-surface-variant">{session.clientFullName}</p> : null}
      {session.locationName ? <p className="mt-0.5 flex items-start gap-1 text-[10px] leading-4 text-on-surface-muted"><MapPin size={11} className="mt-0.5 shrink-0" />{session.locationName}</p> : null}
    </div>
    <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:justify-end">
      <StatusPill label={getSessionStatusLabel(session.status)} tone={sessionTone(session.status)} />
      {nearest ? <span className="text-[9px] font-semibold text-primary-light">Najbliższy</span> : null}
      <SessionDetailsLink session={session} highlighted={nearest} />
    </div>
  </article>;
}

function UpcomingSessionsPanel({ sessions, loading, error }: { sessions: TrainerPortalSession[]; loading: boolean; error: string | null }) {
  return <section className="min-w-0 rounded-xl bg-surface-container-low p-4 lg:p-5"><h2 className="text-sm font-semibold">Nadchodzące sesje</h2><p className="mt-1 text-[10px] text-on-surface-muted">Kolejne zaplanowane treningi w Twoim grafiku</p>
    <div className="mt-3">{loading ? <PanelSkeleton label="Ładowanie nadchodzących sesji" /> : error ? <EmptyState label={error} /> : !sessions.length ? <EmptyState label="Brak nadchodzących zajęć." /> : <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[540px] table-fixed text-left text-[10px]">
      <thead className="text-[9px] uppercase tracking-wider text-on-surface-muted"><tr><th className="w-[16%] pb-2 font-medium">Termin</th><th className="w-[25%] pb-2 pr-2 font-medium">Klient / grupa</th><th className="w-[16%] pb-2 font-medium">Typ sesji</th><th className="w-[17%] pb-2 pr-2 font-medium">Lokalizacja</th><th className="w-[15%] pb-2 font-medium">Status</th><th className="w-[11%] pb-2 text-right font-medium">Akcja</th></tr></thead>
      <tbody>{sessions.map(session => <tr key={session.sessionId} className="border-t border-white/5"><td className="py-3 pr-2 align-top"><p className="font-semibold">{formatSessionDate(session.startAt)}</p><p className="mt-1 text-on-surface-muted">{formatTime(session.startAt)}</p></td><td className="break-words py-3 pr-2 align-top font-semibold">{session.title || session.clientFullName || "Sesja treningowa"}</td><td className="py-3 pr-2 align-top text-on-surface-muted"><span aria-label="Typ sesji niedostępny">—</span></td><td className="break-words py-3 pr-2 align-top text-on-surface-variant">{session.locationName || "—"}</td><td className="py-3 pr-2 align-top"><StatusPill label={getSessionStatusLabel(session.status)} tone={sessionTone(session.status)} /></td><td className="py-3 text-right align-top"><SessionDetailsLink session={session} /></td></tr>)}</tbody>
    </table></div>}</div>
  </section>;
}

function SessionDetailsLink({ session, highlighted = false }: { session: TrainerPortalSession; highlighted?: boolean }) {
  return <Link href={"/trainer/schedule?sessionId=" + session.sessionId + "&date=" + sessionDay(session.startAt)} prefetch={false} aria-label={"Szczegóły zajęć: " + (session.title || session.clientFullName || "sesja treningowa")} className={"inline-flex min-h-7 items-center justify-center rounded-md px-2 text-[10px] font-semibold transition focus-visible:outline-2 focus-visible:outline-primary-light " + (highlighted ? "bg-primary text-on-primary hover:bg-primary-container" : "bg-surface-container text-primary-light hover:bg-surface-container-high")}>Szczegóły</Link>;
}

function RecentClientsPanel({ clients, loading, error }: { clients: TrainerPortalClient[]; loading: boolean; error: string | null }) {
  return <section className="min-w-0 rounded-xl bg-surface-container-low p-4 lg:p-5"><div className="flex items-start justify-between gap-2"><h2 className="text-sm font-semibold">Ostatni klienci</h2><div className="flex items-center gap-2"><span className="text-[9px] uppercase tracking-wider text-on-surface-muted">Najnowsi</span><Link href="/trainer/clients" className="text-[10px] font-semibold text-primary-light">Wszyscy</Link></div></div><p className="mt-1 text-[10px] leading-4 text-on-surface-muted">Ostatnio przypisani podopieczni</p>
    <div className="mt-3 flex flex-col gap-1">{loading ? <PanelSkeleton label="Ładowanie klientów" /> : error ? <EmptyState label={error} /> : !clients.length ? <EmptyState label="Nie masz jeszcze przypisanych klientów." /> : clients.map(client => <ClientRow key={client.clientId} client={client} />)}</div>
  </section>;
}

function ClientRow({ client }: { client: TrainerPortalClient }) {
  const packageName = client.activeClientPackageName ?? client.activePackageName ?? client.currentPackageName ?? client.packageName;
  const remaining = client.activePackageRemainingSessions ?? client.remainingSessions;
  const noPackage = client.hasActivePackage === false || client.isPackageActive === false;
  const packageInfo = noPackage ? "Bez aktywnego pakietu" : [packageName, typeof remaining === "number" && Number.isFinite(remaining) ? "Pozostało wejść: " + remaining : null].filter(Boolean).join(" · ");
  return <Link href={"/trainer/clients/" + client.clientId} prefetch={false} className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-2 transition hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary-light">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container text-[10px] font-semibold text-primary-light">{client.avatarUrl ? <img src={client.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(client.fullName)}</span>
    <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{client.fullName || "Klient #" + client.clientId}</span>{packageInfo ? <span className="mt-0.5 block break-words text-[9px] leading-4 text-on-surface-muted">{packageInfo}</span> : null}</span>
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest/50 text-primary-light"><ArrowRight size={12} /></span>
  </Link>;
}

function SettlementMetric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[9px] leading-4 text-on-surface-muted">{label}</dt><dd className="mt-1 text-xs font-semibold">{value}</dd></div>;
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "success" | "danger" | "primary" | "neutral" }) {
  const colors = { success: "bg-tertiary/10 text-tertiary-light", danger: "bg-error/10 text-error-light", primary: "bg-primary/15 text-primary-light", neutral: "bg-surface-container-high text-on-surface-variant" };
  return <span className={"inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-4 " + colors[tone]}>{label}</span>;
}
function sessionTone(status: string | null): "success" | "danger" | "primary" | "neutral" {
  const value = normalize(status || "");
  return ["completed", "done"].includes(value) ? "success" : ["cancelled", "canceled"].includes(value) ? "danger" : ["active", "inprogress"].includes(value) ? "primary" : "neutral";
}
function EmptyState({ label }: { label: string }) {
  return <p className="rounded-lg bg-surface-container-lowest/20 px-3 py-5 text-center text-xs leading-5 text-on-surface-variant">{label}</p>;
}
function PanelSkeleton({ label }: { label: string }) {
  return <div role="status" aria-label={label} className="space-y-2">{[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-surface-container motion-reduce:animate-none" />)}</div>;
}
function sortSessionsByStart(first: TrainerPortalSession, second: TrainerPortalSession) { return Date.parse(first.startAt) - Date.parse(second.startAt); }
function sortClientsByCreatedAt(first: TrainerPortalClient, second: TrainerPortalClient) { return Date.parse(second.createdAt) - Date.parse(first.createdAt); }
function getFirstName(name?: string | null) { return name?.trim().split(/\s+/)[0] || ""; }
function normalize(value: string) { return value.toLowerCase().trim(); }
function getSessionStatusLabel(status?: string | null) {
  const labels: Record<string, string> = { planned: "Zaplanowana", scheduled: "Zaplanowana", confirmed: "Potwierdzona", cancelled: "Anulowana", canceled: "Anulowana", completed: "Zrealizowana", done: "Zrealizowana", active: "Aktywna", inprogress: "W trakcie" };
  return labels[normalize(status || "")] || userMessage(status, "Status niedostępny");
}
function getInitials(name?: string | null) { return (name || "").trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "K"; }
function validDate(value: string) { const date = new Date(value); return value && Number.isFinite(date.getTime()) ? date : null; }
function formatTime(value: string) { const date = validDate(value); return date ? new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(date) : "—"; }
function formatSessionDate(value: string) { const date = validDate(value); return date ? new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "Europe/Warsaw" }).format(date) : "—"; }
function sessionDay(value: string) { const date = validDate(value); return date ? new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Warsaw" }).format(date) : ""; }
function formatMonth(value: string) { const period = parseTrainerMonth(value); return period ? new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "Europe/Warsaw" }).format(new Date(Date.UTC(period.year, period.month - 1, 15))) : "Bieżący miesiąc"; }

function sessionCountLabel(count: number) {
  const suffix = count === 1 ? "sesja" : count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14) ? "sesje" : "sesji";
  return count + " " + suffix;
}
