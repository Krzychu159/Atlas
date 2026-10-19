import type { CSSProperties } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Dumbbell, MapPin, Trash2 } from "lucide-react";
import type { Package } from "@/app/lib/owner/packages";
import { formatMoney } from "@/app/lib/formatters/money";
import {
  packageKindLabel,
  packageLimitLabel,
  packageListKind,
  packageLocationLabel,
  packageStatusLabel,
} from "./package-list-display";

// Shared by the header and every row, so columns always line up. Applied only where the element is a grid (lg+).
export const packageListGridStyle: CSSProperties = {
  gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1.5fr) minmax(0,1.3fr) minmax(0,1fr) minmax(92px,0.9fr) 88px",
};

type PackageListRowProps = {
  item: Package;
  detailsHref: string;
  // Without it the row is read-only (e.g. the trainer's catalog).
  onDeleteRequest?: (item: Package) => void;
};

export default function PackageListRow({ item, detailsHref, onDeleteRequest }: PackageListRowProps) {
  const period = packageListKind(item) === "period";
  const kind = packageKindLabel(item);
  const limit = packageLimitLabel(item);
  const location = packageLocationLabel(item);
  const price = formatMoney(item.price, item.currency);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-low p-4 before:absolute before:inset-y-0 before:left-0 before:w-0.5 lg:rounded-none lg:bg-surface-container-lowest lg:px-5 lg:py-4 lg:before:hidden lg:odd:bg-surface-container-low/55",
        item.isActive ? "before:bg-tertiary-light" : "before:bg-on-surface-muted/40",
      ].join(" ")}
    >
      <div className="hidden items-center gap-3 lg:grid" style={packageListGridStyle}>
        <div className="flex min-w-0 items-center gap-3">
          <KindIcon period={period} />
          <div className="min-w-0">
            <Link
              href={detailsHref}
              className="block truncate text-sm font-semibold text-on-surface transition hover:text-primary-light"
            >
              {item.name}
            </Link>
            <p className="mt-1 truncate text-xs text-on-surface-muted">{location}</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-on-surface-variant">{kind.title}</p>
          <p className="mt-1 truncate text-xs text-on-surface-muted">{kind.detail}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-on-surface-variant">{limit.primary}</p>
          {limit.secondary ? (
            <p className="mt-1 truncate text-xs text-on-surface-muted">{limit.secondary}</p>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-on-surface">{price}</p>
        <div>
          <StatusBadge active={item.isActive} label={packageStatusLabel(item)} />
        </div>
        <RowActions item={item} detailsHref={detailsHref} onDeleteRequest={onDeleteRequest} />
      </div>

      <div className="lg:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <KindIcon period={period} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-light">
                {kind.title}
              </p>
              <Link
                href={detailsHref}
                className="mt-1 line-clamp-2 text-base font-semibold text-on-surface"
              >
                {item.name}
              </Link>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-on-surface">{price}</p>
            <div className="mt-2 flex justify-end">
              <StatusBadge active={item.isActive} label={packageStatusLabel(item)} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-on-surface-variant">
          <span>{limit.secondary ? `${limit.primary} · ${limit.secondary.toLowerCase()}` : limit.primary}</span>
          <span>{kind.detail}</span>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-on-surface-muted">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={detailsHref}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-[var(--radius-lg)] bg-surface-container px-3 text-xs font-semibold text-primary-light transition hover:bg-surface-container-high"
          >
            {onDeleteRequest ? "Szczegóły i edycja" : "Szczegóły"} <ChevronRight size={15} />
          </Link>
          {onDeleteRequest ? (
            <button
              type="button"
              onClick={() => onDeleteRequest(item)}
              aria-label={`Usuń pakiet ${item.name}`}
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container text-on-surface-muted transition hover:bg-error-container/35 hover:text-error-light"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function KindIcon({ period }: { period: boolean }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container text-primary-light">
      {period ? <CalendarDays size={18} /> : <Dumbbell size={18} />}
    </span>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        active
          ? "bg-tertiary-container text-tertiary-light"
          : "bg-surface-container-high text-on-surface-variant",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function RowActions({
  item,
  detailsHref,
  onDeleteRequest,
}: {
  item: Package;
  detailsHref: string;
  onDeleteRequest?: (item: Package) => void;
}) {
  const detailsLabel = onDeleteRequest ? "Szczegóły i edycja" : "Szczegóły";

  return (
    <div className="flex justify-end gap-1.5">
      {onDeleteRequest ? (
        <button
          type="button"
          onClick={() => onDeleteRequest(item)}
          aria-label={`Usuń pakiet ${item.name}`}
          title="Usuń pakiet"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-error-container/35 hover:text-error-light"
        >
          <Trash2 size={16} />
        </button>
      ) : null}
      <Link
        href={detailsHref}
        aria-label={`${detailsLabel} pakietu ${item.name}`}
        title={detailsLabel}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light"
      >
        <ChevronRight size={17} />
      </Link>
    </div>
  );
}
