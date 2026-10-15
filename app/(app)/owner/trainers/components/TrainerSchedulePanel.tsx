import { CalendarDays } from "lucide-react";
import { PanelEmpty, PanelHeader } from "./TrainerProfilePanel";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import type { OwnerSession } from "@/app/lib/owner/sessions";
import { isConsultationSession } from "@/app/lib/group-sessions";
import { getOwnerSessionPackageName } from "../../components/session-display";

function formatDay(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatus(status?: string | null) {
  const normalized = status?.toLowerCase() || "";

  if (normalized.includes("completed")) return { label: "Zrobione", className: "bg-tertiary/15 text-tertiary-light" };
  if (normalized.includes("cancel")) return { label: "Odwołane", className: "bg-error-container/40 text-error-light" };
  if (normalized.includes("progress")) return { label: "Teraz", className: "bg-primary/15 text-primary-light" };

  return { label: "Plan", className: "bg-surface-container-lowest text-on-surface-variant" };
}

export default function TrainerSchedulePanel({
  sessions,
  pagination,
}: {
  sessions: OwnerSession[];
  pagination?: { page: number; pageSize: number; totalCount: number; totalPages: number; onPageChange: (page: number) => void };
}) {
  const visibleSessions = [...sessions]
    .sort(
      (first, second) =>
        new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
    )
    .slice(0, 4);

  return (
    <section className="card-shell min-w-0 p-4 md:p-5">
      <PanelHeader
        icon={<CalendarDays size={15} />}
        title="Najbliższe sesje"
        meta={`${pagination?.totalCount ?? sessions.length} w grafiku`}
        href="/owner/schedule"
        linkLabel="Grafik"
      />

      {visibleSessions.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {visibleSessions.map((session) => {
            const status = getStatus(session.status);

            return (
              <li
                key={session.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 transition hover:bg-surface-container-low"
              >
                <span className="flex w-12 shrink-0 flex-col items-center rounded-[var(--radius-md)] bg-surface-container-lowest py-1.5 text-center">
                  <span className="text-xs font-semibold text-on-surface">{formatTime(session.startAt)}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-on-surface-muted">{formatDay(session.startAt)}</span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-on-surface">{session.title || "Trening"}</span>
                  <span className="block truncate text-xs text-on-surface-muted">
                    {isConsultationSession(session) ? "Konsultacja" : session.clientsDisplayName || "Brak klienta"} · {session.locationName || "Brak lokalizacji"}
                  </span>
                  {!isConsultationSession(session) ? <span className="block truncate text-[11px] font-medium text-tertiary-light">{getOwnerSessionPackageName(session)}</span> : null}
                </span>

                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <PanelEmpty icon={<CalendarDays size={16} />}>Brak najbliższych sesji.</PanelEmpty>
      )}
      {pagination && pagination.totalPages > 1 ? <PaymentPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalCount} totalPages={pagination.totalPages} onPageChange={pagination.onPageChange} itemLabel="treningów" ariaLabel="Strony treningów trenera" /> : null}
    </section>
  );
}
