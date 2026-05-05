import { ChevronRight } from "lucide-react";
import type { OwnerSession } from "@/app/lib/owner/dashboard";
import { formatSessionTime } from "@/app/lib/formatters/date";

function getSessionTitle(session: OwnerSession) {
  return (
    session.title || session.sessionName || session.name || "Sesja treningowa"
  );
}

function getSessionTrainer(session: OwnerSession) {
  return session.trainerName || session.trainer || "Trener";
}

function getSessionClient(session: OwnerSession) {
  return session.clientName || session.client;
}

function getSessionDuration(session: OwnerSession) {
  return session.durationMinutes || session.duration || 60;
}

function getStatusStyles(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("trakcie")) {
    return "bg-primary/25 text-primary-light";
  }

  if (normalized.includes("oczek")) {
    return "bg-surface-container-high text-on-surface-variant";
  }

  return "bg-tertiary-container text-tertiary-light";
}

export default function DashboardSessionRow({
  session,
  compact = false,
}: {
  session: OwnerSession;
  compact?: boolean;
}) {
  const client = getSessionClient(session);
  const status = session.status || "Zaplanowane";

  return (
    <div className="bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-[74px] shrink-0">
          <p className="text-[1.2rem] leading-none font-semibold">
            {formatSessionTime(
              session.startTime || session.time || session.hour,
            )}
          </p>

          {!compact ? (
            <p className="text-label text-on-surface-muted mt-2">
              {getSessionDuration(session)} min
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-base font-semibold truncate">
            {getSessionTitle(session)}
          </p>
          <p className="text-sm text-on-surface-variant truncate mt-1">
            Trener: {getSessionTrainer(session)}
            {client ? ` • ${client}` : ""}
          </p>
        </div>
      </div>

      {!compact ? (
        <span
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 ${getStatusStyles(
            status,
          )}`}
        >
          {status}
        </span>
      ) : (
        <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
      )}
    </div>
  );
}
