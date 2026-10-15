import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  CalendarDays,
  Files,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  RotateCcw,
  Unlock,
  UserPlus,
  UserRound,
  UserRoundX,
} from "lucide-react";
import type { Client } from "@/app/lib/owner/clients";
import { formatTrainingStartDate } from "@/app/lib/formatters/date";
import ClientRewardProgress from "@/app/components/clients/ClientRewardProgress";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  ProfileChip as Chip,
  ProfileIconAction as IconAction,
  ProfileIconActions,
  ProfileInfoStat as InfoStat,
  ProfileMetaItem as MetaItem,
  profilePrimaryActionClassName,
  profileSecondaryActionClassName,
} from "@/app/components/ui/profile-hero";
import type { MilestoneAccess } from "@/app/lib/milestones";
import {
  getClientName,
  getPortalAccessLabel,
} from "../../components/client-display";
import { clientStatus } from "../../components/client-list-display";

function getInitials(client: Client) {
  return getClientName(client)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const statusToneClasses = {
  active: "bg-tertiary/15 text-tertiary-light",
  new: "bg-primary/15 text-primary-light",
  suspended: "bg-warning-light/15 text-warning-light",
  inactive: "bg-surface-container-lowest text-on-surface-muted",
  unknown: "bg-surface-container-lowest text-on-surface-muted",
} as const;

export default function ClientProfileHero({
  client,
  onEdit,
  onFiles,
  backHref = "/owner/clients",
  paymentsHref,
  milestoneAccess = "owner",
  onPortalAction,
  onArchive,
  onEndCooperation,
  onRestore,
  isPortalActionPending = false,
  isRestorePending = false,
  groupLocationNames,
}: {
  client: Client;
  onEdit?: () => void;
  onFiles?: () => void;
  backHref?: string;
  paymentsHref?: string;
  milestoneAccess?: Exclude<MilestoneAccess, "client">;
  onPortalAction?: () => void;
  onArchive?: () => void;
  onEndCooperation?: () => void;
  onRestore?: () => void;
  isPortalActionPending?: boolean;
  isRestorePending?: boolean;
  groupLocationNames?: string[];
}) {
  const fullName = getClientName(client);
  const resolvedPaymentsHref = paymentsHref || `/owner/clients/${client.id}/payments`;
  const status = clientStatus(client);
  const showPortalStatus = Boolean(client.portalAccessStatus) && Boolean(client.isArchived || onPortalAction);
  const locationLabel = groupLocationNames?.length
    ? `Lokalizacja główna · zajęcia grupowe: ${groupLocationNames.join(", ")}`
    : groupLocationNames ? "Lokalizacja główna" : "Lokalizacja";


  return (
    <section className="card-shell p-4 md:p-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-muted transition hover:text-primary-light"
      >
        <ArrowLeft size={14} />
        Lista klientów
      </Link>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-lowest ring-1 ring-white/10 md:h-[72px] md:w-[72px]">
            {client.isArchived ? (
              <Archive size={24} className="text-on-surface-muted" />
            ) : client.avatarUrl ? (
              <img src={client.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-semibold text-primary-light">{getInitials(client)}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {client.isArchived ? (
                <Chip className="bg-error-container/40 text-error-light">Archiwalny</Chip>
              ) : (
                <Chip className={statusToneClasses[status.tone]}>{status.label}</Chip>
              )}
              {showPortalStatus ? (
                <Chip className="bg-surface-container-lowest text-primary-light">
                  {getPortalAccessLabel(client.portalAccessStatus)}
                </Chip>
              ) : null}
            </div>

            <h1 className="mt-1.5 break-words font-display text-2xl font-semibold leading-tight tracking-tight md:text-[1.9rem]">
              {fullName}
            </h1>

            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <MetaItem icon={<Mail size={13} />} muted={!client.email}>
                {client.email || "Brak e-maila"}
              </MetaItem>
              <MetaItem icon={<Phone size={13} />} muted={!client.phoneNumber}>
                {client.phoneNumber || "Brak telefonu"}
              </MetaItem>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onRestore ? (
            <button
              type="button"
              onClick={onRestore}
              disabled={isRestorePending}
              className={profilePrimaryActionClassName}
            >
              <RotateCcw size={15} />
              {isRestorePending ? "Przywracanie..." : "Przywróć klienta"}
            </button>
          ) : null}
          {!client.isArchived ? (
            <Link
              href={resolvedPaymentsHref}
              className={profilePrimaryActionClassName}
            >
              <ReceiptText size={15} />
              Płatności
            </Link>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className={profileSecondaryActionClassName}
            >
              <Pencil size={14} className="text-primary-light" />
              Edytuj
            </button>
          ) : null}
          {onFiles || onPortalAction || onArchive || onEndCooperation ? (
            <ProfileIconActions>
              {onFiles ? (
                <IconAction label="Pliki klienta" onClick={onFiles}>
                  <Files size={15} />
                </IconAction>
              ) : null}
              {onPortalAction ? (
                <IconAction
                  label={isPortalActionPending ? "Zapisywanie..." : getPortalActionLabel(client.portalAccessStatus)}
                  onClick={onPortalAction}
                  disabled={isPortalActionPending}
                >
                  <PortalActionIcon status={client.portalAccessStatus} />
                </IconAction>
              ) : null}
              {(onFiles || onPortalAction) && (onArchive || onEndCooperation) ? (
                <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-white/10" />
              ) : null}
              {onArchive ? (
                <IconAction label="Archiwizuj klienta" onClick={onArchive} tone="danger" align="end">
                  <Archive size={15} />
                </IconAction>
              ) : null}
              {onEndCooperation ? (
                <IconAction label="Zakończ współpracę" onClick={onEndCooperation} tone="danger" align="end">
                  <UserRoundX size={15} />
                </IconAction>
              ) : null}
            </ProfileIconActions>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/5 pt-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]">
        <InfoStat icon={<UserRound size={13} />} label="Trener" muted={!client.trainerFullName}>
          {client.trainerFullName || "Brak trenera"}
        </InfoStat>
        <InfoStat icon={<CalendarDays size={13} />} label="Rozpoczęcie treningów">
          {formatTrainingStartDate(client.trainingStartDate)}
        </InfoStat>
        <InfoStat icon={<MapPin size={13} />} label={groupLocationNames ? "Lokalizacja główna" : "Lokalizacja"} muted={!client.locationName}>
          {groupLocationNames?.length ? (
            <Tooltip label={locationLabel} align="start">
              <span tabIndex={0} className="focus-visible:outline-none focus-visible:text-primary-light">
                {client.locationName || "Brak lokalizacji"}
                <span className="ml-1 text-xs font-medium text-on-surface-muted">+{groupLocationNames.length} grupowe</span>
              </span>
            </Tooltip>
          ) : client.locationName || "Brak lokalizacji"}
        </InfoStat>
        {client.isArchived ? (
          <InfoStat icon={<Archive size={13} />} label="Data archiwizacji">
            {formatArchivedAt(client.archivedAt)}
          </InfoStat>
        ) : (
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <ClientRewardProgress
              access={milestoneAccess}
              clientId={client.id}
              trainingStartDate={client.trainingStartDate}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function formatArchivedAt(value?: string | null) {
  if (!value) return "Brak daty";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(date);
}

function getPortalActionLabel(status: string | undefined) {
  if (status === "NoAccount") return "Zaproś do panelu";
  if (status === "Invited") return "Zarządzaj zaproszeniem";
  if (status === "Blocked") return "Odblokuj dostęp";
  return "Zablokuj dostęp";
}

function PortalActionIcon({ status }: { status: string | undefined }) {
  if (status === "NoAccount") return <UserPlus size={16} />;
  if (status === "Invited") return <Mail size={16} />;
  if (status === "Blocked") return <Unlock size={16} />;
  return <Lock size={16} />;
}
