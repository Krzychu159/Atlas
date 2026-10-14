import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Client } from "@/app/lib/owner/clients";
import { getClientName } from "./client-display";
import {
  clientBalance,
  clientPackageSummary,
  clientStatus,
  clientTrainerLabel,
  sessionDots,
  type ClientPackageSummary,
  type ClientStatusTone,
} from "./client-list-display";

// Shared by the header and every row, so columns always line up. Applied only where the element is a grid (xl+).
export const ownerClientListGridStyle: CSSProperties = {
  gridTemplateColumns:
    "minmax(0,2fr) minmax(0,1.2fr) minmax(0,2fr) minmax(0,0.9fr) minmax(0,0.9fr) 40px",
};

export default function OwnerClientListRow({ client }: { client: Client }) {
  const profileHref = `/owner/clients/${client.id}`;
  const fullName = getClientName(client);
  const status = clientStatus(client);
  const trainer = clientTrainerLabel(client);
  const balance = clientBalance(client);
  const pkg = clientPackageSummary(client);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3 before:absolute before:inset-y-0 before:left-0 before:w-0.5 xl:rounded-none xl:bg-surface-container-lowest xl:px-5 xl:py-3 xl:before:hidden xl:odd:bg-surface-container-low/55",
        statusAccent[status.tone],
      ].join(" ")}
    >
      <div className="hidden items-center gap-3 xl:grid" style={ownerClientListGridStyle}>
        <div className="flex min-w-0 items-center gap-3">
          <ClientAvatar client={client} fullName={fullName} />
          <div className="min-w-0">
            <Link
              href={profileHref}
              prefetch={false}
              className="block truncate text-sm font-semibold text-on-surface transition hover:text-primary-light"
            >
              {fullName}
            </Link>
            {client.email ? (
              <p className="truncate text-xs text-on-surface-muted">{client.email}</p>
            ) : null}
          </div>
        </div>
        <p className={`truncate text-sm ${trainer.assigned ? "text-on-surface-variant" : "text-on-surface-muted"}`}>
          {trainer.label}
        </p>
        <PackageCell summary={pkg} />
        <p className={`truncate text-sm font-semibold ${balanceTone[balance.tone]}`}>{balance.label}</p>
        <div className="min-w-0">
          <StatusBadge tone={status.tone} label={status.label} />
        </div>
        <ProfileLink href={profileHref} fullName={fullName} />
      </div>

      <div className="xl:hidden">
        <div className="flex items-center gap-3">
          <ClientAvatar client={client} fullName={fullName} />
          <div className="min-w-0 flex-1">
            <Link href={profileHref} prefetch={false} className="block truncate text-sm font-semibold text-on-surface">
              {fullName}
            </Link>
            <p className={`truncate text-xs ${trainer.assigned ? "text-on-surface-variant" : "text-on-surface-muted"}`}>
              Trener: {trainer.label}
            </p>
          </div>
          <StatusBadge tone={status.tone} label={status.label} />
          <ProfileLink href={profileHref} fullName={fullName} touch />
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-4 border-t border-white/5 pt-2.5">
          <div className="min-w-0 flex-1">
            <PackageCell summary={pkg} />
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">Saldo</p>
            <p className={`text-sm font-semibold ${balanceTone[balance.tone]}`}>{balance.label}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function PackageCell({ summary }: { summary: ClientPackageSummary }) {
  if (summary.kind === "none") {
    return <p className="truncate text-sm text-on-surface-muted">{summary.name}</p>;
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="truncate text-sm text-on-surface-variant" title={summary.name}>
          {summary.name}
        </p>
        {summary.extraCount > 0 ? (
          <span
            title={`Aktywne pakiety: ${summary.extraCount + 1}`}
            className="shrink-0 rounded-full bg-surface-container px-1.5 text-[10px] font-semibold leading-4 text-on-surface-variant"
          >
            +{summary.extraCount}
          </span>
        ) : null}
      </div>
      {summary.kind === "session" ? (
        <SessionUsage used={summary.used} limit={summary.limit} />
      ) : (
        <p className="truncate text-xs text-on-surface-muted">{summary.detail}</p>
      )}
    </div>
  );
}

function SessionUsage({ used, limit }: { used: number; limit: number }) {
  const dots = sessionDots(used, limit);
  const label = `Wykorzystano ${used} z ${limit} sesji`;

  return (
    <div className="mt-1 flex min-w-0 items-center gap-2" title={dots?.variant === "proportional" ? `${label} (każdy segment to ok. 10% pakietu)` : label}>
      {dots ? (
        <span role="img" aria-label={label} className="flex min-w-0 items-center gap-[3px] overflow-hidden">
          {Array.from({ length: dots.total }, (_, index) => (
            <span
              key={index}
              className={[
                "shrink-0 rounded-full",
                dots.variant === "exact" ? "h-[5px] w-[5px]" : "h-[5px] w-2.5",
                index < dots.filled ? "bg-primary-light" : "bg-on-surface-muted/30",
              ].join(" ")}
            />
          ))}
        </span>
      ) : null}
      <span className="shrink-0 text-xs font-semibold text-on-surface-variant">
        {used}/{limit}
      </span>
    </div>
  );
}

function ProfileLink({ href, fullName, touch = false }: { href: string; fullName: string; touch?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={`Przejdź do profilu klienta ${fullName}`}
      title="Profil klienta"
      className={`${touch ? "h-10 w-10" : "h-9 w-9"} flex shrink-0 items-center justify-center justify-self-end rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light`}
    >
      <ChevronRight size={17} />
    </Link>
  );
}

const statusAccent: Record<ClientStatusTone, string> = {
  active: "before:bg-tertiary-light",
  new: "before:bg-primary-light",
  suspended: "before:bg-error-light",
  inactive: "before:bg-on-surface-muted/40",
  unknown: "before:bg-on-surface-muted/40",
};

const statusBadge: Record<ClientStatusTone, string> = {
  active: "bg-tertiary-container text-tertiary-light",
  new: "bg-primary/20 text-primary-light",
  suspended: "bg-error-container/35 text-error-light",
  inactive: "bg-surface-container-high text-on-surface-variant",
  unknown: "bg-surface-container-high text-on-surface-muted",
};

const balanceTone = {
  positive: "text-tertiary-light",
  neutral: "text-on-surface",
  missing: "text-on-surface-muted",
} as const;

function StatusBadge({ tone, label }: { tone: ClientStatusTone; label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge[tone]}`}>
      {label}
    </span>
  );
}

function ClientAvatar({ client, fullName }: { client: Client; fullName: string }) {
  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-surface-container">
      {client.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary studio storage URLs
        <img src={client.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-primary-light">{initials}</span>
      )}
    </span>
  );
}
