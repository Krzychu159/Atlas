import Link from "next/link";
import { ChevronRight, Clock3, Dumbbell } from "lucide-react";
import type { Trainer } from "@/app/lib/owner/trainers";

function getInitials(trainer: Trainer) {
  const name = trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;

  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TrainerCard({ trainer }: { trainer: Trainer }) {
  const fullName =
    trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;

  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-surface-container-low">
          {trainer.avatarUrl ? (
            <img
              src={trainer.avatarUrl}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-high text-xs font-semibold text-primary-light">
              {getInitials(trainer)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold leading-6">
            {fullName}
          </h3>

          <div className="mt-2">
            {trainer.hourlyRate ? (
              <span className="rounded-full bg-surface-container-high px-2 py-1 text-[8px] font-medium leading-none text-secondary-light">
                {trainer.hourlyRate} PLN/h
              </span>
            ) : null}
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-5 text-on-surface-variant">
            {trainer.bio || trainer.role || "Trener personalny"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-3">
          <div className="flex items-center gap-1.5 text-on-surface-muted">
            <Dumbbell size={12} />
            <p className="text-[11px] uppercase tracking-wide">Sesje</p>
          </div>
          <p className="mt-3 text-[18px] font-semibold leading-none">
            {trainer.sessionsCount ?? 0}
          </p>
        </div>

        <div className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-3">
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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-surface-container-low px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-container-high"
      >
        Zobacz profil
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
