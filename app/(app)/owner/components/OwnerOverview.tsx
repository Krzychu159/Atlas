"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Users } from "lucide-react";
import { useCurrentUser } from "@/app/components/current-user-provider";
import { formatMoney } from "@/app/lib/formatters/money";
import { usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";
import {
  dashboardChange, dashboardClientCount, dashboardJoinedDate, dashboardMonth, getDashboardAttention, getDashboardRecentClients,
  getDashboardRevenue, getDashboardSummary, validDashboardPeriod,
} from "@/app/lib/owner/dashboard-overview";
import { OWNER_LOCATION_ALL, useOwnerLocationFilter, useOwnerLocationOptions } from "@/app/lib/owner/location-filter";
import { useDashboardResource } from "./use-dashboard-resource";
import OverviewRevenueChart from "./OverviewRevenueChart";
import OverviewInfo from "./OverviewInfo";
import { MonthPicker } from "@/app/components/ui/month-picker";
import styles from "./owner-overview.module.css";

function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className={styles.skeleton} role="status" aria-label="Ładowanie danych">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}
function SectionError({ message, retry }: { message: string; retry: () => void }) {
  return <div className={styles.error} role="alert"><p>{message}</p><button type="button" onClick={retry}>Spróbuj ponownie</button></div>;
}
function Change({ value, percent = true, suffix = "" }: { value: number | null; percent?: boolean; suffix?: string }) {
  const Icon = value !== null && value < 0 ? ArrowDownRight : ArrowUpRight;
  return <p className={`${styles.change} ${value !== null && value > 0 ? styles.positive : value !== null && value < 0 ? styles.negative : styles.neutral}`}>
    {value !== null && value !== 0 ? <Icon size={17} aria-hidden="true" /> : null}
    <span aria-label={value === null ? "Brak podstawy do porównania" : undefined}>{value === null ? "—" : dashboardChange(value, percent)}{value !== null && suffix ? ` ${suffix}` : ""}</span>
  </p>;
}

function MetricCard({ label, value, description, change, percent = true, suffix = "" }: {
  label: string; value: string; description: string; change?: number | null; percent?: boolean; suffix?: string;
}) {
  return <div className={`${styles.card} ${styles.kpi}`}>
    <div className={styles.metricHeading}><h2>{label}</h2><OverviewInfo label={`Informacje: ${label}`}>{description}</OverviewInfo></div>
    <strong>{value}</strong>
    {change !== undefined ? <Change value={change} percent={percent} suffix={suffix} /> : null}
  </div>;
}

export default function OwnerOverview({ currentPeriod }: { currentPeriod: string }) {
  const { user } = useCurrentUser();
  if (user?.role !== "owner") return <p role="alert">Nie masz dostępu do przeglądu studia.</p>;
  return <Overview currentPeriod={currentPeriod} />;
}
function Overview({ currentPeriod }: { currentPeriod: string }) {
  const [period, setPeriod] = useState(currentPeriod);
  const [months, setMonths] = useState<6 | 12>(12);
  const selectPeriod = (value: string) => { if (validDashboardPeriod(value, currentPeriod)) setPeriod(value); };
  const paymentRevision = usePaymentDateCorrectionRevision();
  const { selectedLocationId } = useOwnerLocationFilter();
  const { options: locationOptions, selectedLocationValue } = useOwnerLocationOptions(true);
  // Display uses the hydration-safe value; requests use the stored selection.
  const displayScoped = selectedLocationValue !== OWNER_LOCATION_ALL;
  const scopeLabel = !displayScoped ? "Wszystkie lokalizacje" : locationOptions.find(option => option.value === selectedLocationValue)?.label ?? "Wybrana lokalizacja";
  const scope = selectedLocationId ?? "all";
  const loadSummary = useCallback((signal: AbortSignal) => getDashboardSummary(period, signal, selectedLocationId), [period, selectedLocationId]);
  const loadRevenue = useCallback((signal: AbortSignal) => getDashboardRevenue(period, months, signal, selectedLocationId), [period, months, selectedLocationId]);
  const loadClients = useCallback((signal: AbortSignal) => getDashboardRecentClients(signal, selectedLocationId), [selectedLocationId]);
  const loadAttention = useCallback((signal: AbortSignal) => getDashboardAttention(signal, selectedLocationId), [selectedLocationId]);
  const summary = useDashboardResource(`summary:${scope}:${period}:${paymentRevision}`, loadSummary);
  const revenue = useDashboardResource(`revenue:${scope}:${period}:${months}:${paymentRevision}`, loadRevenue);
  const clients = useDashboardResource(`clients:${scope}`, loadClients);
  const attention = useDashboardResource(`attention:${scope}`, loadAttention);
  const stats = summary.data;
  const partial = stats?.isPartial || revenue.data?.items.some(item => item.isPartial);
  const comparison = stats ? `Porównanie z poprzednim miesiącem (${dashboardMonth(stats.previousPeriod)}).${stats.isPartial ? " Dane od początku bieżącego miesiąca porównujemy z pełnym poprzednim miesiącem." : ""}` : "";
  const percentHelp = " Brak podstawy do porównania oznacza, że nie można wyznaczyć zmiany procentowej względem poprzedniego miesiąca; nie oznacza zmiany o 0%.";
  return <div className={styles.dashboard}>
    <header className={styles.header}>
      <div><h1>Przegląd</h1><p>Najważniejsze informacje o Twoim studiu</p><div className={styles.scopeNote}>{scopeLabel} <OverviewInfo label="Zakres danych przeglądu">{!displayScoped ? "Dane dotyczą całego studia. Wybierz lokalizację w górnym pasku, aby zobaczyć dane jednej lokalizacji." : `Dane dotyczą lokalizacji: ${scopeLabel}. Zmienisz ją w górnym pasku.`}</OverviewInfo></div></div>
      <div className={styles.headerControls}>
      <MonthPicker ariaLabel="Miesiąc przeglądu" min="2000-01" max={currentPeriod} value={period} onChange={selectPeriod} align="end" className={styles.period}
        icon={<CalendarDays size={18} aria-hidden="true" className={styles.periodIcon} />} />
      {partial ? <div className={styles.partial}><span>Miesiąc w toku</span><OverviewInfo label="Informacje o niepełnym miesiącu">Dane za bieżący miesiąc są niepełne. Dane od początku miesiąca porównujemy z pełnym poprzednim miesiącem{stats ? ` (${dashboardMonth(stats.previousPeriod)})` : ""}. Średnia i zmiana przychodu r/r również uwzględniają niepełne dane.</OverviewInfo></div> : null}
      </div>
    </header>
    <section aria-label="Podsumowanie miesiąca" aria-busy={summary.loading}>
      <div className={styles.kpis}>
        {summary.loading ? ["Przychód", "Aktywni klienci", "Nowi klienci", "Wykonane treningi"].map(label => <div key={label} className={`${styles.card} ${styles.kpi}`}><h2>{label}</h2><Skeleton rows={2} /></div>) : stats ? <>
          <MetricCard label="Przychód" value={formatMoney(stats.revenue.current, stats.currency)} change={stats.revenue.changePercent} description={`Przychód studia w wybranym miesiącu. ${comparison}${percentHelp}`} />
          <MetricCard label="Aktywni klienci" value={stats.activeClients.current.toLocaleString("pl-PL")} change={stats.activeClients.change} percent={false} suffix="m/m" description={`Liczba aktywnych klientów w wybranym miesiącu. Zmiana m/m to różnica liczby klientów względem poprzedniego miesiąca. ${comparison}`} />
          <MetricCard label="Nowi klienci" value={stats.newClients.toLocaleString("pl-PL")} description={`Liczba klientów, którzy dołączyli w wybranym miesiącu.${stats.isPartial ? " Bieżący miesiąc jest niepełny." : ""}${stats.clientsWithoutJoinedAt > 0 ? ` Klienci bez daty dołączenia: ${stats.clientsWithoutJoinedAt}. Nie uwzględniamy ich w liczbie nowych klientów.` : ""}`} />
          <MetricCard label="Wykonane treningi" value={stats.completedSessions.current.toLocaleString("pl-PL")} change={stats.completedSessions.changePercent} description={`Liczba wykonanych treningów w wybranym miesiącu. ${comparison}${percentHelp}`} />
        </> : <div className={`${styles.card} ${styles.summaryError}`}><SectionError message={summary.error!} retry={summary.retry} /></div>}
      </div>
    </section>
    <div className={styles.mainGrid}>
      <section className={`${styles.card} ${styles.revenue}`} aria-labelledby="overview-revenue" aria-busy={revenue.loading}>
        <div className={styles.cardHeader}><div className={styles.revenueHeading}><h2 id="overview-revenue">Przychody</h2><OverviewInfo label="Informacje: wykres przychodów">Przychody w kolejnych miesiącach wybranego zakresu. Średnia obejmuje ten sam zakres; r/r oznacza zmianę przychodu względem analogicznego okresu poprzedniego roku. Miesiące w toku zawierają niepełne dane. Punkt wykresu pokazuje dokładny przychód.</OverviewInfo></div>
          <div className={styles.range} role="group" aria-label="Zakres wykresu">{([6, 12] as const).map(value => <button type="button" key={value} aria-pressed={months === value} onClick={() => setMonths(value)}>{value} miesięcy</button>)}</div>
        </div>
        {revenue.loading ? <div className={styles.chartState}><Skeleton rows={5} /></div> : revenue.error ? <div className={styles.chartState}><SectionError message={revenue.error} retry={revenue.retry} /></div> : revenue.data ? <>
          <OverviewRevenueChart key={`${period}:${months}`} data={revenue.data} />
          <footer className={styles.chartFooter}><p><span className={styles.dot} />Średni przychód ({revenue.data.months} mies.): <strong>{formatMoney(revenue.data.average, revenue.data.currency)}</strong></p>
            {revenue.data.yearOverYearChangePercent !== null ? <Change value={revenue.data.yearOverYearChangePercent} suffix="r/r" /> : null}
          </footer>
        </> : null}
      </section>
      <section className={`${styles.card} ${styles.clients}`} aria-labelledby="overview-clients" aria-busy={clients.loading}>
        <div className={styles.cardHeader}><h2 id="overview-clients">Nowi klienci</h2><Link href="/owner/clients">Wszyscy klienci</Link></div>
        {clients.loading ? <Skeleton rows={4} /> : clients.error ? <SectionError message={clients.error} retry={clients.retry} /> : clients.data?.length ? <ul className={styles.clientList}>{clients.data.slice(0, 4).map(client => <li key={client.id}>
          <Link href={`/owner/clients/${client.id}`} className={styles.clientRow}>
            <span className={styles.avatar} aria-hidden="true">{`${client.firstName.trim().charAt(0)}${client.lastName.trim().charAt(0)}`.toLocaleUpperCase("pl-PL") || "—"}</span>
            <span className={styles.clientName}>{client.fullName || `${client.firstName} ${client.lastName}`}</span>
            <span className={styles.clientDate}>{dashboardJoinedDate(client.joinedAt)}</span>
          </Link>
        </li>)}</ul> : <div className={styles.empty}><Users size={28} aria-hidden="true" /><p>Nie ma jeszcze nowych klientów.</p><Link href="/owner/clients">Przejdź do klientów</Link></div>}
      </section>
    </div>
    <section aria-labelledby="overview-attention" aria-busy={attention.loading} className={styles.attention}>
      <div className={styles.attentionHeader}><h2 id="overview-attention">Warto sprawdzić</h2><span>Bieżąca sytuacja w studiu</span></div>
      {attention.loading ? <div className={styles.alerts}>{[0, 1].map(key => <div key={key} className={`${styles.card} ${styles.alert}`}><Skeleton rows={1} /></div>)}</div> : attention.error ? <div className={styles.card}><SectionError message={attention.error} retry={attention.retry} /></div> : attention.data ? <>
        <div className={styles.alerts}>
          <div className={`${styles.card} ${styles.alert}`}><span className={`${styles.dot} ${styles.warningDot}`} /><div><p><strong>{dashboardClientCount(attention.data.clientsWithoutTraining30Days)}</strong> {attention.data.clientsWithoutTraining30Days === 1 ? "nie trenował" : "nie trenowało"} od {attention.data.inactivityDays} dni.</p></div></div>
          <div className={`${styles.card} ${styles.alert}`}><span className={styles.dot} /><div><p><strong>{dashboardClientCount(attention.data.clientsWithOneRemainingSession)}</strong> ma ostatni trening w pakiecie.</p>{attention.data.clientsWithOneRemainingSession > 0 ? <small>Warto zaproponować kolejny pakiet</small> : null}</div></div>
        </div>
        {attention.data.clientsWithoutAttendanceBaseline > 0 ? <p className={styles.note}>Dla {attention.data.clientsWithoutAttendanceBaseline} {attention.data.clientsWithoutAttendanceBaseline === 1 ? "klienta" : "klientów"} brakuje danych do oceny nieaktywności.</p> : null}
      </> : null}
    </section>
  </div>;
}
