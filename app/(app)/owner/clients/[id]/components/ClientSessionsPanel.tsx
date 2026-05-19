import { CalendarDays, Dumbbell } from "lucide-react";
import type { OwnerSession } from "@/app/lib/owner/sessions";
import { formatDateTime } from "@/app/lib/formatters/date";
import { getOwnerSessionPackageName } from "../../../components/session-display";

function getStatusStyles(status?: string | null) {
  const normalized = status?.toLowerCase() || "";

  if (normalized.includes("completed") || normalized.includes("zrealiz")) {
    return "text-tertiary-light";
  }

  if (normalized.includes("cancel")) return "text-error-light";

  return "text-primary-light";
}

export default function ClientSessionsPanel({
  sessions,
}: {
  sessions: OwnerSession[];
}) {
  const visibleSessions = [...sessions]
    .sort(
      (first, second) =>
        new Date(second.startAt).getTime() - new Date(first.startAt).getTime(),
    )
    .slice(0, 3);

  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-section-title">Sesje klienta</p>
        <p className="text-label text-on-surface-muted">
          {sessions.length} przypisanych
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {visibleSessions.length > 0 ? (
          visibleSessions.map((session) => (
            <div
              key={session.id}
              className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container text-primary-light">
                    <Dumbbell size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface">
                      {session.title || "Sesja treningowa"}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {formatDateTime(session.startAt)}
                    </p>
                    <p className="mt-2 text-label text-on-surface-muted">
                      {session.trainerFullName || "Brak trenera"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-tertiary-light">
                      {getOwnerSessionPackageName(session)}
                    </p>
                  </div>
                </div>

                <p
                  className={`shrink-0 text-sm font-semibold ${getStatusStyles(
                    session.status,
                  )}`}
                >
                  {session.status || "Zaplanowano"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-6 text-center text-on-surface-variant">
            <CalendarDays className="mx-auto mb-3 text-primary-light" />
            Brak przypisanych sesji.
          </div>
        )}
      </div>
    </section>
  );
}
