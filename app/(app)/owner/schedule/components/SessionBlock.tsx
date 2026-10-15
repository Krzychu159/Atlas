"use client";

import type { CSSProperties } from "react";
import { LoaderCircle, MapPin, UserRound, UsersRound } from "lucide-react";
import { getSessionOutlookColor } from "@/app/lib/calendar/outlook-colors";
import { groupSeatsLabel, isGroupTraining } from "@/app/lib/group-sessions";
import { formatTime } from "../date-utils";
import {
  getSessionStatusLabel,
  getSessionTitle,
  isCancelledSession,
} from "../session-utils";
import type { CalendarSession } from "../types";

export const SESSION_STATUS_DOTS = [
  { status: "Planned", className: "border border-on-surface-variant bg-transparent" },
  { status: "Active", className: "bg-info-light" },
  { status: "Completed", className: "bg-tertiary" },
  { status: "Cancelled", className: "bg-error" },
] as const;

export function statusDotClassName(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  return (
    SESSION_STATUS_DOTS.find((item) => item.status.toLowerCase() === normalized)?.className ??
    "bg-on-surface-muted"
  );
}

function hasCategoryColor(session: CalendarSession) {
  return Boolean(
    session.primaryOutlookCategoryColor ||
      session.outlookCategoryColors?.some(
        (category) => category.name === session.primaryOutlookCategory && category.color,
      ),
  );
}

// Uncategorized sessions follow the studio accent instead of a fixed Outlook blue.
function sessionAccent(session: CalendarSession) {
  return hasCategoryColor(session) ? getSessionOutlookColor(session).border : "var(--color-primary-container)";
}

function shortPersonName(fullName?: string | null) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function getSessionHeadline(session: CalendarSession) {
  const title = getSessionTitle(session);
  if (isGroupTraining(session)) return { primary: title, secondary: groupSeatsLabel(session) };
  const clients = session.clientsDisplayName?.trim();
  const knownType = Boolean(session.title?.trim() || session.plannedSessionType || session.actualSessionType);
  return clients ? { primary: clients, secondary: knownType ? title : null } : { primary: title, secondary: null };
}

export function describeSession(session: CalendarSession) {
  const { primary, secondary } = getSessionHeadline(session);
  return [
    `${formatTime(session.startAt)}–${formatTime(session.endAt)}`,
    primary,
    secondary,
    session.trainerFullName ? `trener ${session.trainerFullName}` : null,
    session.locationName,
    getSessionStatusLabel(session.status),
    isGroupTraining(session) && session.isFullyBooked === true ? "brak miejsc" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function SessionBlock<TSession extends CalendarSession>({
  session,
  heightPx,
  selected,
  pending,
  style,
  onSelect,
}: {
  session: TSession;
  heightPx: number;
  selected?: boolean;
  pending?: boolean;
  style?: CSSProperties;
  onSelect: (session: TSession) => void;
}) {
  const cancelled = isCancelledSession(session);
  const group = isGroupTraining(session);
  const { primary, secondary } = getSessionHeadline(session);
  const trainer = shortPersonName(session.trainerFullName);
  const extraParticipants = !group && (session.participantsCount ?? 0) > 1 ? session.participantsCount : null;
  // Height tiers: ~30 min → one line, ~60 min → time / name / trainer + location, 90+ min → more detail.
  const tier = heightPx < 44 ? "line" : heightPx < 100 ? "standard" : "tall";
  const roomy = heightPx >= 132;
  const label = describeSession(session);

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      aria-label={label}
      aria-busy={pending || undefined}
      aria-pressed={selected || undefined}
      title={label}
      style={{ ...style, "--session-accent": sessionAccent(session) } as CSSProperties}
      className={[
        "@container group absolute flex flex-col overflow-hidden rounded-[var(--radius-default)] border-l-[3px] border-[color-mix(in_srgb,var(--session-accent)_55%,white)] text-left outline-none transition-[background-color,box-shadow,opacity] duration-150",
        "bg-[var(--session-accent)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] hover:z-10 hover:bg-[color-mix(in_srgb,var(--session-accent)_88%,white)] hover:shadow-ambient",
        "focus-visible:z-10 focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]",
        selected ? "z-10 bg-[color-mix(in_srgb,var(--session-accent)_85%,white)] shadow-[0_0_0_2px_var(--color-primary-light)]" : "",
        cancelled ? "opacity-55 hover:opacity-90" : "",
        tier === "line" ? "justify-center px-2" : "px-2 py-1.5",
      ].join(" ")}
    >
      {tier === "line" ? (
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4">
          <StatusMark status={session.status} pending={pending} />
          <span className="shrink-0 font-semibold tabular-nums text-[color-mix(in_srgb,var(--session-accent)_30%,white)]">
            {formatTime(session.startAt)}
          </span>
          <span className={`min-w-0 truncate font-semibold text-on-surface ${cancelled ? "line-through" : ""}`}>{primary}</span>
        </span>
      ) : (
        <>
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4">
            <span className="min-w-0 truncate font-semibold tabular-nums text-[color-mix(in_srgb,var(--session-accent)_30%,white)]">
              {formatTime(session.startAt)}
              <span className="hidden @[110px]:inline"> – {formatTime(session.endAt)}</span>
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              {group ? (
                <span className="hidden items-center gap-1 rounded-full bg-black/25 px-1.5 text-[10px] font-semibold text-on-surface @[120px]:inline-flex">
                  <UsersRound size={11} aria-hidden="true" />
                  {session.isFullyBooked === true ? "Brak miejsc" : compactSeats(session)}
                </span>
              ) : null}
              {extraParticipants ? (
                <span className="hidden items-center gap-0.5 text-[10px] font-semibold text-on-surface-variant @[130px]:inline-flex">
                  <UsersRound size={11} aria-hidden="true" />
                  {extraParticipants}
                </span>
              ) : null}
              <StatusMark status={session.status} pending={pending} />
            </span>
          </span>
          <span
            className={[
              "mt-0.5 min-w-0 text-[13px] font-semibold leading-[18px] text-on-surface",
              roomy ? "line-clamp-2" : "truncate",
              cancelled ? "line-through decoration-on-surface-variant" : "",
            ].join(" ")}
          >
            {primary}
          </span>
          {tier === "tall" && secondary ? (
            <span className="min-w-0 truncate text-[11px] leading-4 text-on-surface-variant">{secondary}</span>
          ) : null}
          <span className="mt-auto flex min-w-0 items-center gap-x-2.5 pt-0.5 text-[11px] leading-4 text-on-surface-variant">
            {trainer ? (
              <span className="flex min-w-0 items-center gap-1">
                <UserRound size={11} aria-hidden="true" className="shrink-0 opacity-70" />
                <span className="truncate">{trainer}</span>
              </span>
            ) : null}
            {session.locationName ? (
              <span className="hidden min-w-0 items-center gap-1 @[120px]:flex">
                <MapPin size={11} aria-hidden="true" className="shrink-0 opacity-70" />
                <span className="truncate">{session.locationName}</span>
              </span>
            ) : null}
            {tier !== "tall" && secondary ? (
              <span className="hidden min-w-0 truncate text-on-surface-muted @[420px]:block">{secondary}</span>
            ) : null}
            <span className="ml-auto hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted @[420px]:block">
              {getSessionStatusLabel(session.status)}
            </span>
          </span>
          {roomy ? (
            <span className="hidden truncate pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted @[150px]:block @[420px]:hidden">
              {getSessionStatusLabel(session.status)}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

function compactSeats(session: CalendarSession) {
  if (session.bookedSeats == null) return "Grupowe";
  return session.capacity != null ? `${session.bookedSeats}/${session.capacity}` : String(session.bookedSeats);
}

function StatusMark({ status, pending }: { status?: string | null; pending?: boolean }) {
  if (pending) return <LoaderCircle size={11} aria-hidden="true" className="shrink-0 animate-spin text-on-surface" />;
  return <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${statusDotClassName(status)}`} />;
}
