import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Pencil,
  ReceiptText,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button, ButtonLink } from "@/app/components/ui/button";
import type { TrainerRate } from "@/app/lib/owner/settlements";
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

function getRateLabel(trainer: Trainer, rates: TrainerRate[]) {
  const activeRate = rates.find((rate) => rate.isActive) ?? rates[0];
  const value = activeRate?.rate ?? trainer.hourlyRate ?? 0;

  return `${value} zł / h`;
}

export default function TrainerProfileHeader({
  trainer,
  rates,
  onEdit,
}: {
  trainer: Trainer;
  rates: TrainerRate[];
  onEdit: () => void;
}) {
  const fullName =
    trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;
  const settlementsHref = `/owner/trainers/${trainer.id}/settlements`;

  return (
    <section className="card-shell overflow-hidden p-5 md:p-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <Link
          href="/owner/trainers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"
        >
          <ArrowLeft size={18} />
          Lista trenerów
        </Link>
        <p className="text-label text-on-surface-muted">Profil trenera</p>
      </div>

      <div className="grid gap-7 lg:grid-cols-[190px_1fr_190px] lg:items-start">
        <div className="flex justify-center lg:justify-start">
          <div className="relative shrink-0">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[28px] bg-surface-container-lowest outline outline-4 outline-secondary">
              {trainer.avatarUrl ? (
                <img
                  src={trainer.avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[2.5rem] font-semibold text-primary-light">
                  {getInitials(trainer)}
                </span>
              )}
            </div>

            <div className="absolute -right-2 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-light text-on-tertiary shadow-soft">
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-label text-primary-light">
            {trainer.role || "Personal performance coach"}
          </p>

          <h1 className="mt-3 font-display text-[2.7rem] font-semibold leading-[0.92] tracking-tight md:text-[4rem]">
            {fullName}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <Mail size={16} className="text-primary-light" />
              {trainer.email || "Brak e-maila"}
            </div>

            <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <Phone size={16} className="text-primary-light" />
              {trainer.phone || "Brak telefonu"}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-secondary/30 pt-6 md:grid-cols-4">
            <HeroStat label="Sesje" value={trainer.sessionsCount ?? 0} />
            <HeroStat
              label="Ocena"
              value={
                <span className="inline-flex items-center gap-1">
                  {trainer.ratingAverage
                    ? trainer.ratingAverage.toFixed(1)
                    : "0.0"}
                  <Star
                    size={18}
                    className="fill-tertiary-light text-tertiary-light"
                  />
                </span>
              }
            />
            <HeroStat
              label="Doświadczenie"
              value={`${trainer.experienceYears ?? 0} lat`}
            />
            <HeroStat label="Stawka" value={getRateLabel(trainer, rates)} />
          </div>
        </div>

        <div className="flex gap-3  lg:flex-col">
          <Button
            type="button"
            onClick={onEdit}
            size="lg"
            icon={<Pencil size={16} />}
            className="flex-1 p-4"
          >
            Edytuj profil
          </Button>

          <ButtonLink
            type="button"
            href={settlementsHref}
            variant="secondary"
            size="lg"
            icon={<ReceiptText size={16} />}
            className="flex-1 p-4 "
          >
            Rozliczenia
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 flex min-h-8 items-center text-2xl font-semibold leading-none text-on-surface">
        {value}
      </p>
    </div>
  );
}
