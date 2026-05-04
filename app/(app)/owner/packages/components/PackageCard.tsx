"use client";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  MoreVertical,
  Trash2,
} from "lucide-react";
import type { Package } from "@/app/lib/owner/packages";

type PackageCardProps = {
  item: Package;
  onDelete: (id: number) => void;
};

function getPackageIcon(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("vip") || normalized.includes("pro")) {
    return <Dumbbell size={22} />;
  }

  if (
    normalized.includes("4:1") ||
    normalized.includes("3:1") ||
    normalized.includes("2:1")
  ) {
    return <Dumbbell size={22} />;
  }

  return <Dumbbell size={22} />;
}

function getPackageTag(item: Package) {
  if (!item.isActive) return "Archiwalny";
  if (item.sessionsLimit >= 12) return "Popularny";
  if (item.sessionsLimit >= 8) return "Aktywny";
  return "Start";
}

function getTagStyles(item: Package) {
  if (!item.isActive) {
    return "bg-surface-container-high text-on-surface-variant";
  }

  if (item.sessionsLimit >= 12) {
    return "bg-tertiary-container text-tertiary-light";
  }

  return "bg-primary/20 text-primary-light";
}

export default function PackageCard({ item, onDelete }: PackageCardProps) {
  return (
    <div className="card-shell p-5 min-h-[260px] flex flex-col relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="h-12 w-12 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center text-primary-light">
          {getPackageIcon(item.name)}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold ${getTagStyles(
              item,
            )}`}
          >
            {getPackageTag(item)}
          </span>

          <button
            onClick={() => onDelete(item.id)}
            className="h-9 w-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-error-light transition-colors"
            aria-label="Usuń pakiet"
          >
            <Trash2 size={15} />
          </button>

          <button
            className="h-9 w-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant"
            aria-label="Więcej"
          >
            <MoreVertical size={15} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[1.25rem] leading-7 font-semibold">{item.name}</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant line-clamp-2">
          {item.description || "Brak opisu pakietu"}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light">
            <CalendarDays size={15} />
          </div>
          <div>
            <p className="text-label text-on-surface-muted">Limit sesji</p>
            <p className="text-sm font-semibold">{item.sessionsLimit} sesji</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light">
            <Clock3 size={15} />
          </div>
          <div>
            <p className="text-label text-on-surface-muted">Czas trwania</p>
            <p className="text-sm font-semibold">{item.durationDays} dni</p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5 flex items-end justify-between gap-4">
        <div>
          <p className="text-label text-on-surface-muted">Cena pakietu</p>
          <p className="mt-2 text-[1.7rem] leading-none font-semibold tracking-tight">
            {item.price} {item.currency}
          </p>
        </div>

        <button className="h-11 w-11 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center text-primary-light">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
