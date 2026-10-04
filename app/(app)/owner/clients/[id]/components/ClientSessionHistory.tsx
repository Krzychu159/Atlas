"use client";

import { userTrainingType } from "@/app/lib/user-messages";

import { userStatus } from "@/app/lib/user-messages";

import { useMemo, useState } from "react";
import { Clock3, Dumbbell, MapPin, UserRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { formatDateTime } from "@/app/lib/formatters/date";
import type {
  OwnerSession,
  OwnerSessionParticipant,
} from "@/app/lib/owner/sessions";

type SessionGroup = "upcoming" | "history" | "cancelled";

const PAGE_SIZE = 6;
const SESSION_GROUPS: SessionGroup[] = ["upcoming", "history", "cancelled"];

const groupLabels: Record<SessionGroup, string> = {
  upcoming: "Nadchodzące",
  history: "Historia",
  cancelled: "Anulowane",
};

export default function ClientSessionHistory({
  clientId,
  sessions,
}: {
  clientId: number;
  sessions: OwnerSession[];
}) {
  const [visibleCounts, setVisibleCounts] = useState<
    Record<SessionGroup, number>
  >({
    upcoming: PAGE_SIZE,
    history: PAGE_SIZE,
    cancelled: PAGE_SIZE,
  });
  const groupedSessions = useMemo(
    () => groupClientSessions(sessions),
    [sessions],
  );

  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label text-on-surface-muted">Sesje klienta</p>
          <h2 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight">
            Pełna historia treningów
          </h2>
        </div>
        <p className="text-label text-on-surface-muted">
          {sessions.length} przypisanych
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-7">
        {SESSION_GROUPS.map((group) => {
          const items = groupedSessions[group];
          const visibleItems = items.slice(0, visibleCounts[group]);

          return (
            <div key={group}>
              <div className="flex items-center gap-3">
                <h3 className="text-section-title">{groupLabels[group]}</h3>
                <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-[10px] font-semibold text-primary-light">
                  {items.length}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {visibleItems.length ? (
                  visibleItems.map((session) => (
                    <SessionRow
                      key={session.id}
                      clientId={clientId}
                      session={session}
                    />
                  ))
                ) : (
                  <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-5 text-sm text-on-surface-variant">
                    Brak sesji w tej sekcji.
                  </div>
                )}
              </div>

              {visibleItems.length < items.length ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    setVisibleCounts((current) => ({
                      ...current,
                      [group]: current[group] + PAGE_SIZE,
                    }))
                  }
                >
                  Pokaż więcej
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SessionRow({
  clientId,
  session,
}: {
  clientId: number;
  session: OwnerSession;
}) {
  const participant = session.participants?.find(
    (item) => item.clientId === clientId,
  );

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container text-primary-light">
            <Dumbbell size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-on-surface">
              {session.title || "Sesja treningowa"}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} className="text-primary-light" />
                {formatDateTime(session.startAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserRound size={14} className="text-primary-light" />
                {session.trainerFullName || "Brak trenera"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-primary-light" />
                {session.locationName || "Brak lokalizacji"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[48%] lg:justify-end">
          <MetaChip label={userStatus(session.status)} />
          <MetaChip
            label={
              userTrainingType(session.actualSessionType || session.plannedSessionType, "Typ nieokreślony")
            }
          />
          {participant ? <BillingChip participant={participant} /> : null}
        </div>
      </div>
    </article>
  );
}

function BillingChip({ participant }: { participant: OwnerSessionParticipant }) {
  const charged = participant.isCountedFromPackage;
  const packageName = participant.packageName
    ? ` · ${participant.packageName}`
    : "";
  const label = charged
    ? `Rozliczono ${participant.sessionsCharged || 1} wej.${packageName}`
    : participant.countsAgainstPackage
      ? `Planowane rozliczenie z pakietu${packageName}`
      : "Bez zużycia wejścia";

  return <MetaChip label={label} tone={charged ? "success" : "neutral"} />;
}

function MetaChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success";
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
        tone === "success"
          ? "bg-tertiary/15 text-tertiary-light"
          : "bg-surface-container-low text-on-surface-variant",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function groupClientSessions(sessions: OwnerSession[]) {
  const now = Date.now();
  const result: Record<SessionGroup, OwnerSession[]> = {
    upcoming: [],
    history: [],
    cancelled: [],
  };

  sessions.forEach((session) => {
    const status = (session.status || "").toLowerCase();
    const isCancelled =
      status.includes("cancel") ||
      status.includes("anul") ||
      status.includes("odwoł");

    if (isCancelled) {
      result.cancelled.push(session);
    } else if (new Date(session.startAt).getTime() > now) {
      result.upcoming.push(session);
    } else {
      result.history.push(session);
    }
  });

  result.upcoming.sort(byStartAscending);
  result.history.sort(byStartDescending);
  result.cancelled.sort(byStartDescending);

  return result;
}

function byStartAscending(first: OwnerSession, second: OwnerSession) {
  return new Date(first.startAt).getTime() - new Date(second.startAt).getTime();
}

function byStartDescending(first: OwnerSession, second: OwnerSession) {
  return new Date(second.startAt).getTime() - new Date(first.startAt).getTime();
}
