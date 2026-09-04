import { LoaderCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { formatMoney } from "@/app/lib/formatters/money";
import type { TrainerCostSession } from "@/app/lib/owner/analytics";
import {
  getSessionDate,
  getSessionId,
  getSessionNumber,
} from "../statistics-config";

type SessionsProfitabilityProps = {
  sessions: TrainerCostSession[];
  page: number;
  totalPages: number;
  totalCount: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

// Sekcja: Rentowność sesji
export default function SessionsProfitability({
  sessions,
  page,
  totalPages,
  totalCount,
  isLoading,
  onPageChange,
}: SessionsProfitabilityProps) {
  return (
    <section className="card-shell overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-4 md:px-5">
        <div>
          <h2 className="text-section-title">Rentowność sesji</h2>
          <p className="mt-1 text-xs text-on-surface-muted">
            {totalCount} sesji w zestawieniu
          </p>
        </div>
        {isLoading ? (
          <LoaderCircle size={17} className="animate-spin text-primary-light" />
        ) : null}
      </div>

      {sessions.length ? (
        <>
          {/* Sekcja: Tabela sesji desktop */}
          <div className="hidden overflow-x-auto lg:block">
            <SessionTable sessions={sessions} />
          </div>

          {/* Sekcja: Karty sesji mobile */}
          <div className="flex flex-col gap-3 p-3 lg:hidden">
            {sessions.map((session, index) => (
              <SessionCard
                key={getSessionId(session, index)}
                session={session}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex min-h-32 items-center justify-center px-5 py-8 text-center text-sm text-on-surface-muted">
          Brak sesji spełniających wybrane kryteria.
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={onPageChange}
      />
    </section>
  );
}

function SessionTable({ sessions }: { sessions: TrainerCostSession[] }) {
  return (
    <table className="w-full min-w-[900px] text-left">
      <thead>
        <tr className="text-label text-on-surface-muted">
          <th className="px-5 py-3 font-semibold">Data / miejsce</th>
          <th className="px-4 py-3 font-semibold">Trener</th>
          <th className="px-4 py-3 font-semibold">Klient / pakiet</th>
          <th className="px-4 py-3 text-right font-semibold">Przychód</th>
          <th className="px-4 py-3 text-right font-semibold">Koszt</th>
          <th className="px-5 py-3 text-right font-semibold">Zysk</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {sessions.map((session, index) => {
          const { revenue, cost, profit } = getSessionAmounts(session);

          return (
            <tr
              key={getSessionId(session, index)}
              className="transition hover:bg-white/[0.025]"
            >
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-on-surface">
                  {formatSessionDate(getSessionDate(session))}
                </p>
                <p className="mt-1 text-xs text-on-surface-muted">
                  {session.locationName || "Bez lokalizacji"}
                </p>
              </td>
              <td className="px-4 py-4 text-sm text-on-surface">
                {session.trainerName || "—"}
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-on-surface">
                  {session.clientName || "—"}
                </p>
                <p className="mt-1 text-xs text-on-surface-muted">
                  {session.packageName ||
                    `${getSessionNumber(session, "participantsCount")} uczestników`}
                </p>
              </td>
              <td className="px-4 py-4 text-right text-sm font-semibold text-on-surface">
                {formatMoney(revenue)}
              </td>
              <td className="px-4 py-4 text-right text-sm text-on-surface-variant">
                {formatMoney(cost)}
              </td>
              <td
                className={
                  profit >= 0
                    ? "px-5 py-4 text-right text-sm font-semibold text-tertiary-light"
                    : "px-5 py-4 text-right text-sm font-semibold text-error-light"
                }
              >
                {formatMoney(profit)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SessionCard({ session }: { session: TrainerCostSession }) {
  const { revenue, cost, profit } = getSessionAmounts(session);

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-on-surface">
            {session.trainerName || "Sesja treningowa"}
          </p>
          <p className="mt-1 text-xs text-on-surface-muted">
            {formatSessionDate(getSessionDate(session))} ·{" "}
            {session.locationName || "Bez lokalizacji"}
          </p>
        </div>
        <span
          className={
            profit >= 0
              ? "font-semibold text-tertiary-light"
              : "font-semibold text-error-light"
          }
        >
          {formatMoney(profit)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Metric label="Przychód" value={formatMoney(revenue)} />
        <Metric label="Koszt" value={formatMoney(cost)} />
      </div>
    </article>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 text-xs text-on-surface-muted">
      <span>
        Strona {page} z {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Poprzednia
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Następna
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-container-high p-2.5">
      <p className="text-on-surface-muted">{label}</p>
      <p className="mt-1 font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function getSessionAmounts(session: TrainerCostSession) {
  const revenue = getSessionNumber(session, "revenueAmount");
  const cost = getSessionNumber(
    session,
    "trainerCostAmount",
    "potentialTrainerCostAmount",
  );
  const profit = getSessionNumber(session, "profitAmount") || revenue - cost;
  return { revenue, cost, profit };
}

function formatSessionDate(value: string) {
  if (!value) return "Brak daty";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: value.includes("T") ? "short" : undefined,
      }).format(date);
}
