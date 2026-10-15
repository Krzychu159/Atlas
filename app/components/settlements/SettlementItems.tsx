"use client";

import { useState, type CSSProperties } from "react";
import { FileCheck2 } from "lucide-react";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { CONSULTATION_SESSION_TYPE } from "@/app/lib/group-sessions";
import { userTrainingType } from "@/app/lib/user-messages";
import {
  formatSettlementDate,
  formatSettlementMoney,
  formatSettlementNumber,
} from "@/app/lib/trainer/settlement-display";

export type SettlementItemView = {
  sessionId: number;
  startAt: string;
  title: string | null;
  sessionType: string | null;
  locationName: string | null;
  isCoveredByContract: boolean;
  contractNumber: string | null;
  hours: number;
  rate: number;
  rateType: string | null;
  amount: number;
  participantsCount: number;
};

// Totals come from the backend settlement; the list never sums amounts itself.
export type SettlementItemsTotals = {
  sessions: number;
  hours: number;
  amount?: number | null;
};

const PAGE_SIZE = 25;

// Columns live in a CSS variable, so the Tailwind class never changes and mobile cards keep their own layout.
const gridClass = "lg:grid-cols-[var(--settlement-item-columns)]";
const gridStyle = {
  "--settlement-item-columns": "150px minmax(0,2fr) minmax(0,1.1fr) 96px 80px 112px",
} as CSSProperties;

// Consultations have no clients; show that instead of a misleading "0".
export function settlementParticipantsLabel(item: Pick<SettlementItemView, "sessionType" | "participantsCount">, short = false) {
  if (item.sessionType === CONSULTATION_SESSION_TYPE) return short ? "bez klienta" : "Bez klienta";
  const count = formatSettlementNumber(item.participantsCount);
  return short ? `${count} os.` : count;
}

export function settlementContractNumbers(items: readonly Pick<SettlementItemView, "isCoveredByContract" | "contractNumber">[]) {
  return [...new Set(items.filter((item) => item.isCoveredByContract).map((item) => item.contractNumber?.trim()).filter((value): value is string => Boolean(value)))];
}

export default function SettlementItems({
  title,
  items,
  totals,
  emptyLabel = "Brak sesji w tej kategorii w wybranym miesiącu.",
  muteAmounts = false,
}: {
  title: string;
  items: SettlementItemView[];
  totals?: SettlementItemsTotals;
  emptyLabel?: string;
  muteAmounts?: boolean;
}) {
  const [page, setPage] = useState(1);

  if (!items.length) {
    return <p className="px-4 py-4 text-sm text-on-surface-variant md:px-5">{emptyLabel}</p>;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const contracts = settlementContractNumbers(items);
  const amountClassName = muteAmounts ? "text-on-surface-variant" : "text-tertiary-light";

  return (
    <div className="bg-surface-container-lowest">
      {contracts.length ? (
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low px-4 py-2.5 text-xs text-on-surface-variant md:px-5">
          <FileCheck2 size={14} className="shrink-0 text-primary-light" aria-hidden="true" />
          {contracts.map((number) => (
            <span key={number} className="rounded-full bg-surface-container px-2.5 py-0.5 font-semibold text-on-surface">Umowa {number}</span>
          ))}
        </div>
      ) : null}

      <div role="table" aria-label={title}>
        <div role="row" style={gridStyle} className={`hidden items-center gap-3 bg-surface-container-low px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted lg:grid ${gridClass}`}>
          <span role="columnheader">Data</span>
          <span role="columnheader">Sesja</span>
          <span role="columnheader">Rodzaj</span>
          <span role="columnheader" className="text-right">Uczestnicy</span>
          <span role="columnheader" className="text-right">Godziny</span>
          <span role="columnheader" className="text-right">Kwota</span>
        </div>

        <div role="rowgroup" className="flex flex-col gap-1.5 p-3 lg:block lg:p-0">
          {visible.map((item) => (
            <div
              key={item.sessionId}
              role="row"
              style={gridStyle}
              className={`rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2.5 text-sm lg:grid lg:items-center lg:gap-3 lg:rounded-none lg:bg-surface-container-lowest lg:px-5 lg:py-2.5 lg:odd:bg-surface-container-low/55 ${gridClass}`}
            >
              <span role="cell" className="hidden whitespace-nowrap text-on-surface-variant lg:block">{formatSettlementDate(item.startAt)}</span>
              <span role="cell" className="flex min-w-0 items-start justify-between gap-3 lg:block">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-on-surface" title={item.title || undefined}>{item.title || "Sesja bez nazwy"}</span>
                  <span className="block text-[11px] text-on-surface-muted lg:hidden">{formatSettlementDate(item.startAt)}</span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums lg:hidden ${amountClassName}`}>{formatSettlementMoney(item.amount)}</span>
              </span>
              <span role="cell" className="mt-1 block text-xs text-on-surface-variant lg:mt-0 lg:text-sm">
                {userTrainingType(item.sessionType)}
                <span className="lg:hidden"> · {settlementParticipantsLabel(item, true)} · {formatSettlementNumber(item.hours)} h</span>
              </span>
              <span role="cell" className="hidden text-right tabular-nums text-on-surface-variant lg:block">{settlementParticipantsLabel(item)}</span>
              <span role="cell" className="hidden text-right tabular-nums text-on-surface-variant lg:block">{formatSettlementNumber(item.hours)}</span>
              <span role="cell" className={`hidden whitespace-nowrap text-right font-semibold tabular-nums lg:block ${amountClassName}`}>{formatSettlementMoney(item.amount)}</span>
            </div>
          ))}
        </div>

        {totals ? (
          <div role="row" style={gridStyle} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-surface-container-low px-4 py-3 text-sm font-semibold lg:grid lg:gap-3 lg:px-5 ${gridClass}`}>
            <span role="cell" className="text-on-surface lg:col-span-3">Razem · {sessionsLabel(totals.sessions)}</span>
            <span role="cell" className="hidden lg:block" />
            <span role="cell" className="tabular-nums text-on-surface-variant lg:text-right">{formatSettlementNumber(totals.hours)} h</span>
            <span role="cell" className={`whitespace-nowrap tabular-nums lg:text-right ${amountClassName}`}>{totals.amount != null ? formatSettlementMoney(totals.amount) : null}</span>
          </div>
        ) : null}
      </div>

      {items.length > PAGE_SIZE ? (
        <PaymentPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={items.length} onPageChange={setPage} itemLabel="sesji" ariaLabel={`Strony: ${title}`} />
      ) : null}
    </div>
  );
}

function sessionsLabel(count: number) {
  if (!Number.isFinite(count)) return "liczba sesji niedostępna";
  if (count === 1) return "1 sesja";
  const last = count % 10;
  const lastTwo = count % 100;
  return `${formatSettlementNumber(count)} ${last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "sesje" : "sesji"}`;
}
