import Link from "next/link";
import { CalendarDays, Clock3, Dumbbell } from "lucide-react";
import type { OwnerSession } from "@/app/lib/owner/sessions";
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

function getStatusLabel(status?: string | null) {
  const normalized = status?.toLowerCase() || "";

  if (normalized.includes("completed")) return "Zrobione";
  if (normalized.includes("cancel")) return "Odwołane";
  if (normalized.includes("progress")) return "Teraz";

  return "Plan";
}

export default function TrainerSchedulePanel({
  sessions,
}: {
  sessions: OwnerSession[];
}) {
  const visibleSessions = [...sessions]
    .sort(
      (first, second) =>
        new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
    )
    .slice(0, 4);

  return (
    <section className="card-shell p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Najbliższe sesje</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Sesje przypisane do tego trenera.
          </p>
        </div>
        <Link
          href="/owner/schedule"
          className="text-label text-primary-light"
          prefetch={false}
        >
          Zobacz grafik
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {visibleSessions.length > 0 ? (
          visibleSessions.map((session) => (
            <div
              key={session.id}
              className="grid grid-cols-[72px_1fr_auto] items-center gap-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4"
            >
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-center">
                <span className="text-sm font-semibold text-on-surface">
                  {formatTime(session.startAt)}
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
                  {formatDay(session.startAt)}
                </span>
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-on-surface">
                  {session.title || "Trening"}
                </p>
                <p className="mt-1 truncate text-sm text-on-surface-variant">
                  {session.clientsDisplayName || "Brak klienta"} ·{" "}
                  {session.locationName || "Brak lokalizacji"}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-tertiary-light">
                  {getOwnerSessionPackageName(session)}
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-primary-light">
                {getStatusLabel(session.status) === "Plan" ? (
                  <Clock3 size={14} />
                ) : (
                  <Dumbbell size={14} />
                )}
                {getStatusLabel(session.status)}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
            <CalendarDays className="mx-auto mb-3 text-primary-light" />
            Brak najbliższych sesji.
          </div>
        )}
      </div>
    </section>
  );
}
