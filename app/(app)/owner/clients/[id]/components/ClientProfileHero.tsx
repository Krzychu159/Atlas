import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Files,
  Mail,
  Pencil,
  Phone,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import type { Client } from "@/app/lib/owner/clients";
import { getClientName } from "../../components/client-display";

function getInitials(client: Client) {
  return getClientName(client)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getClientAgeInMonths(createdAt?: string | null) {
  if (!createdAt) return 0;

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) return 0;

  const now = new Date();
  const years = now.getFullYear() - createdDate.getFullYear();
  const months = now.getMonth() - createdDate.getMonth();
  const totalMonths = years * 12 + months;

  return Math.max(0, totalMonths);
}

function getMilestoneProgress(months: number) {
  return Math.min(100, Math.round((months / 12) * 100));
}

export default function ClientProfileHero({
  client,
  onEdit,
  onFiles,
}: {
  client: Client;
  onEdit: () => void;
  onFiles: () => void;
}) {
  const fullName = getClientName(client);
  const membershipMonths = getClientAgeInMonths(client.createdAt);
  const milestoneProgress = getMilestoneProgress(membershipMonths);

  return (
    <section className="card-shell overflow-hidden p-5 md:p-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <Link
          href="/owner/clients"
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
              {client.avatarUrl ? (
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

            <div className="absolute -right-2 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-light text-on-tertiary shadow-soft">
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-label text-primary-light">
            {client.status || "Profil klienta"}
          </p>

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
              label="Lokalizacja"
              value={client.locationName || "Brak"}
            />
            <ClientMilestones
              months={membershipMonths}
              progress={milestoneProgress}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-container"
          >
            <Pencil size={16} />
            Edytuj dane
          </button>
          <button
            type="button"
            onClick={onFiles}
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-primary-light transition hover:bg-surface-container-high"
          >
            <Files size={16} />
            Pliki
          </button>
          <Link
            href={`/owner/clients/${client.id}/payments`}
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-primary-light transition hover:bg-surface-container-high"
          >
            <ReceiptText size={16} />
            Płatności
          </Link>
        </div>
      </div>
    </section>
  );
}

function ClientMilestones({
  months,
  progress,
}: {
  months: number;
  progress: number;
}) {
  const milestones = [3, 6, 12];

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-primary-light" />
          <p className="text-label text-on-surface-muted">Nagrody</p>
        </div>
        <p className="shrink-0 text-xs font-semibold text-on-surface">
          {months} mies.
        </p>
      </div>

      <div className="relative mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-low">
          <div
            className="h-full rounded-full bg-primary-gradient transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 grid -translate-y-1/2 grid-cols-3">
          {milestones.map((milestone) => (
            <div key={milestone} className="flex justify-center">
              <span
                className={[
                  "h-3 w-[2px] rounded-full",
                  months >= milestone ? "bg-primary-light" : "bg-white/20",
                ].join(" ")}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 text-center text-[9px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {milestones.map((milestone) => (
          <span
            key={milestone}
            className={months >= milestone ? "text-primary-light" : ""}
          >
            {milestone} mies.
          </span>
        ))}
      </div>
    </div>
  );
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
