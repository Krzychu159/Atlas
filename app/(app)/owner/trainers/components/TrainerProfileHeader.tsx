"use client";

import { getOutlookColor } from "@/app/lib/calendar/outlook-colors";
import Link from "next/link";
import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";
import {
  ArrowLeft,
  Banknote,
  CalendarCheck,
  FileSignature,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  ProfileChip,
  ProfileInfoStat,
  ProfileMetaItem,
  ProfileTabs,
  profilePrimaryActionClassName,
  profileSecondaryActionClassName,
} from "@/app/components/ui/profile-hero";
import { getActiveTrainerHourlyRate, type TrainerRate } from "@/app/lib/owner/settlements";
import type { Trainer } from "@/app/lib/owner/trainers";
import { trainerStatus, trainerStatusLabel, type TrainerStatus } from "../trainer-list-display";

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
  const activeRate = getActiveTrainerHourlyRate(rates);
  const value = activeRate?.rate ?? trainer.hourlyRate ?? 0;

  return `${value} zł / h`;
}

const statusToneClasses: Record<TrainerStatus, string> = {
  active: "bg-tertiary/15 text-tertiary-light",
  paused: "bg-warning-light/15 text-warning-light",
  inactive: "bg-surface-container-lowest text-on-surface-muted",
  unknown: "bg-surface-container-lowest text-on-surface-muted",
};

export default function TrainerProfileHeader({
  trainer,
  rates,
  onEdit,
  onContracts,
  ratesAvailable = true,
  activeTab = "profile",
  actions,
}: {
  trainer: Trainer;
  rates: TrainerRate[];
  onEdit?: () => void;
  onContracts?: () => void;
  ratesAvailable?: boolean;
  activeTab?: "profile" | "settlements";
  actions?: ReactNode;
}) {
  const { selectedLocationId } = useOwnerLocationFilter();
  const fullName =
    trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;
  const settlementsHref = `/owner/trainers/${trainer.id}/settlements${
    selectedLocationId == null ? "" : `?locationId=${selectedLocationId}`
  }`;
  const status = trainerStatus(trainer);
  const locationNames = trainer.locationNames?.filter(Boolean) ?? [];
  const bio = trainer.bio?.trim();

  return (
    <section className="card-shell p-4 md:p-6">
      <Link
        href="/owner/trainers"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-muted transition hover:text-primary-light"
      >
        <ArrowLeft size={14} />
        Lista trenerów
      </Link>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            style={{ borderColor: getOutlookColor(trainer.outlookCategoryColor).border }}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border-2 bg-surface-container-lowest md:h-[72px] md:w-[72px]"
          >
            {trainer.avatarUrl ? (
              <img src={trainer.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-semibold text-primary-light">{getInitials(trainer)}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <ProfileChip className={statusToneClasses[status]}>{trainerStatusLabel(status)}</ProfileChip>
              {trainer.role ? (
                <ProfileChip className="bg-surface-container-lowest text-primary-light">{trainer.role}</ProfileChip>
              ) : null}
            </div>

            <h1 className="mt-1.5 break-words font-display text-2xl font-semibold leading-tight tracking-tight md:text-[1.9rem]">
              {fullName}
            </h1>

            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <ProfileMetaItem icon={<Mail size={13} />} muted={!trainer.email}>
                {trainer.email || "Brak e-maila"}
              </ProfileMetaItem>
              <ProfileMetaItem icon={<Phone size={13} />} muted={!trainer.phone}>
                {trainer.phone || "Brak telefonu"}
              </ProfileMetaItem>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions ?? (
            <>
              {onEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  disabled={!ratesAvailable}
                  className={profilePrimaryActionClassName}
                >
                  <Pencil size={14} />
                  Edytuj
                </button>
              ) : null}
              {onContracts ? (
                <button type="button" onClick={onContracts} className={profileSecondaryActionClassName}>
                  <FileSignature size={14} className="text-primary-light" />
                  Umowa
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/5 pt-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]">
        <ProfileInfoStat icon={<CalendarCheck size={13} />} label="Sesje">
          {trainer.sessionsCount ?? 0}
        </ProfileInfoStat>
        <ProfileInfoStat icon={<Banknote size={13} />} label="Stawka" muted={!ratesAvailable}>
          {ratesAvailable ? getRateLabel(trainer, rates) : "Niedostępne"}
        </ProfileInfoStat>
        <ProfileInfoStat icon={<MapPin size={13} />} label="Lokalizacje" muted={!locationNames.length}>
          {locationNames.length > 1 ? (
            <Tooltip label={locationNames.join(", ")} align="start">
              <span tabIndex={0} className="focus-visible:text-primary-light focus-visible:outline-none">
                {locationNames[0]}
                <span className="ml-1 text-xs font-medium text-on-surface-muted">+{locationNames.length - 1}</span>
              </span>
            </Tooltip>
          ) : locationNames[0] || "Brak lokalizacji"}
        </ProfileInfoStat>
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <ProfileInfoStat icon={<Sparkles size={13} />} label="Specjalizacja" muted={!bio}>
            {bio ? (
              <Tooltip label={bio} align="start" className="max-w-full">
                <span tabIndex={0} className="line-clamp-2 font-medium text-on-surface-variant focus-visible:text-primary-light focus-visible:outline-none">
                  {bio}
                </span>
              </Tooltip>
            ) : "Brak specjalizacji"}
          </ProfileInfoStat>
        </div>
      </div>

      <ProfileTabs
        label="Sekcje trenera"
        tabs={[
          { href: `/owner/trainers/${trainer.id}`, label: "Profil", icon: <UserRound size={14} />, active: activeTab === "profile" },
          { href: settlementsHref, label: "Rozliczenia", icon: <ReceiptText size={14} />, active: activeTab === "settlements" },
        ]}
      />
    </section>
  );
}
