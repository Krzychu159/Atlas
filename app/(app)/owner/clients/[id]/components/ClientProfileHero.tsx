import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  Files,
  Lock,
  Mail,
  Pencil,
  Phone,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Unlock,
  UserPlus,
  UserRoundX,
} from "lucide-react";
import type { Client } from "@/app/lib/owner/clients";
import ClientRewardProgress from "@/app/components/clients/ClientRewardProgress";
import type { MilestoneAccess } from "@/app/lib/milestones";
import {
  getClientName,
  getPortalAccessLabel,
} from "../../components/client-display";

function getInitials(client: Client) {
  return getClientName(client)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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

  return (
    <section className="card-shell overflow-hidden p-5 md:p-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"
        >
          <ArrowLeft size={18} />
          Lista klientów
        </Link>
        <p className="text-label text-on-surface-muted">Karta klienta</p>
      </div>

      <div className="grid gap-7 lg:grid-cols-[190px_1fr_190px] lg:items-start">
        <div className="flex justify-center lg:justify-start">
          <div className="relative shrink-0">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[28px] bg-surface-container-lowest outline outline-4 outline-secondary">
              {client.isArchived ? (
                <Archive size={44} className="text-on-surface-muted" />
              ) : client.avatarUrl ? (
                <img
                  src={client.avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[2.5rem] font-semibold text-primary-light">
                  {getInitials(client)}
                </span>
              )}
            </div>

            {!client.isArchived ? (
              <div className="absolute -right-2 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-light text-on-tertiary shadow-soft">
                <ShieldCheck size={18} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-label text-primary-light">
            {client.status || "Profil klienta"}
          </p>
          {client.isArchived ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-error-container/40 px-3 py-1.5 text-xs font-semibold text-error-light">
                Archiwalny
              </span>
              {client.portalAccessStatus ? (
                <span className="inline-flex rounded-full bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-primary-light">
                  {getPortalAccessLabel(client.portalAccessStatus)}
                </span>
              ) : null}
            </div>
          ) : onPortalAction ? (
            <span className="mt-3 inline-flex rounded-full bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-primary-light">
              {getPortalAccessLabel(client.portalAccessStatus)}
            </span>
          ) : null}

          <h1 className="mt-3 font-display text-[2.7rem] font-semibold leading-[0.92] tracking-tight md:text-[4rem]">
            {fullName}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <Mail size={16} className="text-primary-light" />
              {client.email || "Brak e-maila"}
            </div>

            <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <Phone size={16} className="text-primary-light" />
              {client.phoneNumber || "Brak telefonu"}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-secondary/30 pt-6 md:grid-cols-3">
            <HeroStat label="Trener" value={client.trainerFullName || "Brak"} />
            <HeroStat
              label={groupLocationNames ? "Lokalizacja główna" : "Lokalizacja"}
              value={
                <div>
                  <span>{client.locationName || "Brak"}</span>
                  {groupLocationNames?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {groupLocationNames.map((locationName) => (
                        <span
                          key={locationName}
                          className="rounded-full bg-surface-container-lowest px-2 py-1 text-[10px] font-semibold text-primary-light"
                        >
                          Zajęcia grupowe: {locationName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              }
            />
            {client.isArchived ? (
              <HeroStat
                label="Data archiwizacji"
                value={formatArchivedAt(client.archivedAt)}
              />
            ) : (
              <ClientRewardProgress
                access={milestoneAccess}
                clientId={client.id}
                trainingStartDate={client.trainingStartDate}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {onPortalAction ? (
            <button
              type="button"
              onClick={onPortalAction}
              disabled={isPortalActionPending}
              className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-primary-light transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PortalActionIcon status={client.portalAccessStatus} />
              {isPortalActionPending ? "Zapisywanie..." : getPortalActionLabel(client.portalAccessStatus)}
            </button>
          ) : null}
          {onRestore ? (
            <button
              type="button"
              onClick={onRestore}
              disabled={isRestorePending}
              className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} />
              {isRestorePending ? "Przywracanie..." : "Przywróć klienta"}
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-container"
            >
              <Pencil size={16} />
              Edytuj dane
            </button>
          ) : null}
          {onFiles ? (
            <button
              type="button"
              onClick={onFiles}
              className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-primary-light transition hover:bg-surface-container-high"
            >
              <Files size={16} />
              Pliki
            </button>
          ) : null}
          {!client.isArchived ? (
            <Link
              href={resolvedPaymentsHref}
              className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-primary-light transition hover:bg-surface-container-high"
            >
              <ReceiptText size={16} />
              Płatności
            </Link>
          ) : null}
          {onArchive ? (
            <button
              type="button"
              onClick={onArchive}
              className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-error-light transition hover:bg-surface-container-high"
            >
              <Archive size={16} />
              Archiwizuj klienta
            </button>
          ) : null}
          {onEndCooperation ? (
            <button
              type="button"
              onClick={onEndCooperation}
              className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-error-light/35 bg-transparent px-5 text-sm font-semibold text-error-light transition hover:bg-error-container/25"
            >
              <UserRoundX size={16} />
              Zakończ współpracę
            </button>
          ) : null}
        </div>
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

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 min-h-8 text-lg font-semibold leading-tight text-on-surface">
        {value}
      </p>
    </div>
  );
}
