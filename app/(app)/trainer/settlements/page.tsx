"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, ReceiptText, Wallet, CheckCircle2 } from "lucide-react";
import DashboardStatCard from "@/app/(app)/owner/components/DashboardStatCard";
import { NativeDateInput } from "@/app/components/ui/native-date-input";
import { getTrainerPortalSettlement, type TrainerPortalSettlement } from "@/app/lib/trainer/portal";
import {
  formatSettlementDate, formatSettlementMoney, formatSettlementNumber,
  getCurrentTrainerMonth, getSettlementErrorMessage, getSettlementPaymentLabel,
  moveTrainerMonth, parseTrainerMonth,
} from "@/app/lib/trainer/settlement-display";
import SettlementItems from "./components/SettlementItems";

export default function TrainerSettlementsPage() {
  const [monthValue, setMonthValue] = useState(getCurrentTrainerMonth);
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel trenera</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">Moje rozliczenia</h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">Sesje, godziny rozliczeniowe i wypłata za wybrany miesiąc.</p>
        </div>
        <div className="flex w-full items-end gap-2 sm:w-auto">
          <button type="button" aria-label="Poprzedni miesiąc" onClick={() => setMonthValue((value) => moveTrainerMonth(value, -1))} disabled={monthValue === "0001-01"} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container text-primary-light disabled:opacity-50"><ChevronLeft size={18} /></button>
          <div className="min-w-0 flex-1 sm:w-56">
            <label htmlFor="trainer-settlement-month" className="mb-2 block text-label text-on-surface-muted">Miesiąc i rok</label>
            <NativeDateInput id="trainer-settlement-month" type="month" value={monthValue} min="0001-01" max="9999-12" onChange={(event) => { if (parseTrainerMonth(event.target.value)) setMonthValue(event.target.value); }} className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container px-4 pr-12 text-sm font-semibold" />
          </div>
          <button type="button" aria-label="Następny miesiąc" onClick={() => setMonthValue((value) => moveTrainerMonth(value, 1))} disabled={monthValue === "9999-12"} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container text-primary-light disabled:opacity-50"><ChevronRight size={18} /></button>
        </div>
      </header>
      <SettlementContent key={monthValue} monthValue={monthValue} />
    </div>
  );
}

function SettlementContent({ monthValue }: { monthValue: string }) {
  const [settlement, setSettlement] = useState<TrainerPortalSettlement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const period = parseTrainerMonth(monthValue);
    if (!period) return;
    const { year, month } = period;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTrainerPortalSettlement(year, month);
        if (active) setSettlement(data);
      } catch (err) {
        if (active) {
          setSettlement(null);
          setError(getSettlementErrorMessage(err));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [monthValue, attempt]);

  if (isLoading) return <SettlementSkeleton />;
  if (error) return (
    <div role="alert" className="card-shell p-6 text-on-surface-variant">
      <p>{error}</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 text-sm font-semibold text-primary-light">Spróbuj ponownie</button>
    </div>
  );
  if (!settlement) return <div className="card-shell p-8 text-center text-on-surface-variant">Brak danych rozliczenia za wybrany miesiąc.</div>;

  const items = settlement.items ?? [];
  const nonContractedItems = settlement.nonContractedItems ?? [];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>div]:min-w-0 [&_p]:break-words">
        <DashboardStatCard label="Kwota rozliczenia" value={formatSettlementMoney(settlement.totalAmount)} note="Rozliczenie wybranego miesiąca" icon={<Wallet size={22} />} accent="primary" />
        <DashboardStatCard label="Sesje w rozliczeniu" value={formatSettlementNumber(settlement.totalSessions)} note="Sesje objęte umową" icon={<ReceiptText size={22} />} />
        <DashboardStatCard label="Godziny rozliczeniowe" value={formatSettlementNumber(settlement.totalHours)} note="Sesje objęte umową" icon={<Clock3 size={22} />} />
        <DashboardStatCard label="Status wypłaty" value={getSettlementPaymentLabel(settlement.isPaid)} note={settlement.paidAt ? `Data wypłaty: ${formatSettlementDate(settlement.paidAt)}` : settlement.isPaid === true ? "Data wypłaty niedostępna" : "Data wypłaty nie została podana"} icon={<CheckCircle2 size={22} />} accent={settlement.isPaid === true ? "success" : "neutral"} />
      </div>
      {!items.length && !nonContractedItems.length ? (
        <div className="card-shell p-5 text-on-surface-variant">Brak sesji do wyświetlenia w wybranym miesiącu.</div>
      ) : null}
      <section className="grid gap-3 md:grid-cols-2">
        <div className="card-shell p-5">
          <h2 className="text-section-title">Sesje objęte umową</h2>
          <p className="mt-3 text-sm text-on-surface-variant">{formatSettlementNumber(settlement.contractedTotalSessions)} sesji · {formatSettlementNumber(settlement.contractedTotalHours)} godzin rozliczeniowych</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-tertiary-light">{formatSettlementMoney(settlement.contractedTotalAmount)}</p>
        </div>
        <div className="card-shell p-5">
          <h2 className="text-section-title">Sesje poza umową</h2>
          <p className="mt-3 text-sm text-on-surface-variant">{formatSettlementNumber(settlement.nonContractedTotalSessions)} sesji · {formatSettlementNumber(settlement.nonContractedTotalHours)} godzin rozliczeniowych</p>
          <p className="mt-3 text-sm leading-6 text-on-surface-muted">Te sesje są pokazane osobno. Nie doliczamy ich do kwoty rozliczenia.</p>
        </div>
      </section>
      <p className="text-sm leading-6 text-on-surface-muted">Godziny rozliczeniowe wynikają z zasad rozliczenia i mogą różnić się od czasu trwania zajęć.</p>
      <SettlementItems title="Szczegóły sesji objętych umową" description="Godziny, stawki i kwoty dla sesji ujętych w rozliczeniu." items={items} />
      <SettlementItems title="Szczegóły sesji poza umową" description="Sesje wykazane poza umową, bez doliczania ich do kwoty rozliczenia." items={nonContractedItems} />
    </>
  );
}

function SettlementSkeleton() {
  return (
    <div role="status" aria-label="Ładowanie rozliczenia" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => <div key={index} className="card-shell h-36 animate-pulse bg-surface-container motion-reduce:animate-none" />)}
      </div>
      <div className="card-shell h-72 animate-pulse bg-surface-container motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">Ładowanie rozliczenia...</span>
    </div>
  );
}
