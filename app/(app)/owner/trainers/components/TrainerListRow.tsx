import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, ReceiptText } from "lucide-react";
import { getOutlookColor } from "@/app/lib/calendar/outlook-colors";
import type { Trainer } from "@/app/lib/owner/trainers";
import {
  trainerExperienceLabel,
  trainerFullName,
  trainerInitials,
  trainerSessionsCount,
  trainerSpecialization,
  trainerStatus,
  trainerStatusLabel,
  type TrainerStatus,
} from "../trainer-list-display";

// Shared by the header and every row, so columns always line up. Applied only where the element is a grid (lg+).
export const trainerListGridStyle: CSSProperties = {
  gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1.8fr) minmax(0,0.7fr) minmax(0,0.9fr) minmax(92px,0.9fr) 88px",
};

export default function TrainerListRow({ trainer }: { trainer: Trainer }) {
  const profileHref = `/owner/trainers/${trainer.id}`;
  const settlementsHref = `/owner/trainers/${trainer.id}/settlements`;
  const fullName = trainerFullName(trainer);
  const status = trainerStatus(trainer);
  const sessions = trainerSessionsCount(trainer);
  const experience = trainerExperienceLabel(trainer.experienceYears);
  const specialization = trainerSpecialization(trainer);
  const locations = trainer.locationNames?.filter(Boolean).join(", ");

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-low p-4 before:absolute before:inset-y-0 before:left-0 before:w-0.5 lg:rounded-none lg:bg-surface-container-lowest lg:px-5 lg:py-4 lg:before:hidden lg:odd:bg-surface-container-low/55",
        statusAccent[status],
      ].join(" ")}
    >
      <div className="hidden items-center gap-3 lg:grid" style={trainerListGridStyle}>
        <div className="flex min-w-0 items-center gap-3">
          <TrainerAvatar trainer={trainer} fullName={fullName} />
          <div className="min-w-0">
            <Link
              href={profileHref}
              className="block truncate text-sm font-semibold text-on-surface transition hover:text-primary-light"
            >
              {fullName}
            </Link>
            {trainer.email ? (
              <p className="mt-1 truncate text-xs text-on-surface-muted">{trainer.email}</p>
            ) : null}
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-on-surface-variant" title={specialization}>
            {specialization}
          </p>
          {locations ? (
            <p className="mt-1 truncate text-xs text-on-surface-muted">{locations}</p>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-on-surface">{sessions ?? "—"}</p>
        <p className="text-sm text-on-surface-variant">{experience ?? "—"}</p>
        <div>
          <StatusBadge status={status} />
        </div>
        <div className="flex justify-end gap-1.5">
          <Link
            href={settlementsHref}
            aria-label={`Rozliczenia trenera ${fullName}`}
            title="Rozliczenia"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light"
          >
            <ReceiptText size={16} />
          </Link>
          <Link
            href={profileHref}
            aria-label={`Profil trenera ${fullName}`}
            title="Profil i edycja"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light"
          >
            <ChevronRight size={17} />
          </Link>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <TrainerAvatar trainer={trainer} fullName={fullName} />
            <div className="min-w-0">
              <Link href={profileHref} className="block truncate text-base font-semibold text-on-surface">
                {fullName}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{specialization}</p>
            </div>
          </div>
          <div className="shrink-0">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-on-surface-variant">
          {sessions !== null ? <span>Sesje: <strong className="font-semibold text-on-surface">{sessions}</strong></span> : null}
          {experience ? <span>Doświadczenie: <strong className="font-semibold text-on-surface">{experience}</strong></span> : null}
          {locations ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-on-surface-muted">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">{locations}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={profileHref}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-[var(--radius-lg)] bg-surface-container px-3 text-xs font-semibold text-primary-light transition hover:bg-surface-container-high"
          >
            Profil i edycja <ChevronRight size={15} />
          </Link>
          <Link
            href={settlementsHref}
            aria-label={`Rozliczenia trenera ${fullName}`}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light"
          >
            <ReceiptText size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

const statusAccent: Record<TrainerStatus, string> = {
  active: "before:bg-tertiary-light",
  paused: "before:bg-warning-light",
  inactive: "before:bg-on-surface-muted/40",
  unknown: "before:bg-on-surface-muted/40",
};

const statusBadge: Record<TrainerStatus, string> = {
  active: "bg-tertiary-container text-tertiary-light",
  paused: "bg-warning-container/60 text-warning-light",
  inactive: "bg-surface-container-high text-on-surface-variant",
  unknown: "bg-surface-container-high text-on-surface-muted",
};

function StatusBadge({ status }: { status: TrainerStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge[status]}`}>
      {trainerStatusLabel(status)}
    </span>
  );
}

function TrainerAvatar({ trainer, fullName }: { trainer: Trainer; fullName: string }) {
  return (
    <span
      style={{ borderColor: getOutlookColor(trainer.outlookCategoryColor).border }}
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border-2 bg-surface-container"
    >
      {trainer.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary studio storage URLs
        <img src={trainer.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-primary-light">{trainerInitials(trainer)}</span>
      )}
    </span>
  );
}
