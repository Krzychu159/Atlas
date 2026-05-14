"use client";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { Package } from "@/app/lib/owner/packages";

type PackageCardProps = {
  item: Package;
  onDeleteRequest: (item: Package) => void;
};

function getParticipantsLabel(value?: number | null) {
  if (!value || value <= 1) return "1:1";
  if (value === 2) return "2 osoby";
  return `${value} osób`;
}

export default function PackageCard({
  item,
  onDeleteRequest,
}: PackageCardProps) {
  return (
    <div className="card-shell relative flex min-h-[260px] flex-col overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-high text-primary-light">
          <Dumbbell size={22} />
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-tertiary-container px-3 py-1 text-[11px] font-bold text-tertiary-light">
            <UsersRound size={13} />
            {getParticipantsLabel(item.participantsCount)}
          </span>

          <button
            onClick={() => onDeleteRequest(item)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:text-error-light"
            aria-label="Usuń pakiet"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[1.25rem] font-semibold leading-7">{item.name}</p>
        {item.locationName ? (
          <p className="mt-2 text-xs text-on-surface-muted">
            {item.locationName}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Metric icon={<CalendarDays size={15} />} label="Sesje">
          {item.sessionsLimit} sesji
        </Metric>
        <Metric icon={<Clock3 size={15} />} label="Czas">
          {item.durationDays} dni
        </Metric>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/5 pt-6">
        <div>
          <p className="text-label text-on-surface-muted">Cena pakietu</p>
          <p className="mt-2 text-[1.7rem] font-semibold leading-none tracking-tight">
            {item.price} {item.currency}
          </p>
        </div>

        <Link
          href={`/owner/packages/${item.id}`}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-high text-primary-light transition hover:bg-primary hover:text-on-primary"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
        {icon}
      </div>
      <div>
        <p className="text-label text-on-surface-muted">{label}</p>
        <p className="text-sm font-semibold">{children}</p>
      </div>
    </div>
  );
}
