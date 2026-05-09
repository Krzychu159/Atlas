import { ChevronRight, Clock3, Dumbbell, Star } from "lucide-react";
import type { Trainer } from "@/app/lib/owner/trainers";
import Link from "next/link";

function getInitials(trainer: Trainer) {
  const name = trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;

  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStatusStyles(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("active") || normalized.includes("aktywn")) {
    return "bg-tertiary-container text-tertiary-light";
  }

  if (normalized.includes("leave") || normalized.includes("urlop")) {
    return "bg-surface-container-high text-on-surface-variant";
  }

  return "bg-surface-container-high text-on-surface-variant";
}

export default function TrainerCard({ trainer }: { trainer: Trainer }) {
  const fullName =
    trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;

  return (
    <div className="bg-surface-container rounded-[var(--radius-lg)] p-5">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-[var(--radius-md)] bg-surface-container-low flex items-center justify-center overflow-hidden shrink-0">
          {trainer.avatarUrl ? (
            <img
              src={trainer.avatarUrl}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center text-xs font-semibold text-primary-light">
              {getInitials(trainer)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] leading-6 font-semibold truncate">
            {fullName}
          </h3>

          <div className="mt-2  ">
            {trainer.hourlyRate ? (
              <span className="px-2 py-1 rounded-full text-[8px] font-medium leading-none bg-surface-container-high text-secondary-light">
                {trainer.hourlyRate} PLN/h
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-on-surface-variant text-sm leading-5 line-clamp-2">
            {trainer.bio || trainer.role || "Trener personalny"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-surface-container-low rounded-[var(--radius-md)] px-3 py-3">
          <div className="flex items-center gap-1.5 text-on-surface-muted">
            <Dumbbell size={12} />
            <p className="text-[11px] uppercase tracking-wide">
              Sesje (30 dni)
            </p>
          </div>
          <p className="mt-3 text-[18px] font-semibold leading-none">
            {trainer.sessionsCount ?? 0} &nbsp;
            <span className="text-sm font-medium text-success">+37%</span>
          </p>
        </div>

        <div className="bg-surface-container-low rounded-[var(--radius-md)] px-3 py-3">
          <div className="flex items-center gap-1.5 text-on-surface-muted">
            <Clock3 size={12} />
            <p className="text-[11px] uppercase tracking-wide">Dośw.</p>
          </div>
          <p className="mt-3 text-[18px] font-semibold leading-none">
            {trainer.experienceYears ?? 0}y
          </p>
        </div>
      </div>

      <Link
        href={`/owner/trainers/${trainer.id}`}
        className="w-full mt-3 rounded-[var(--radius-md)] bg-surface-container-low hover:bg-surface-container-high transition-colors px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium"
      >
        Zobacz profil
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
