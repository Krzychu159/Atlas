import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  Dumbbell,
  Globe,
  MapPin,
  Pencil,
  Repeat,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import type { Package, PackageClient } from "@/app/lib/owner/packages";
import { isPeriodPackage } from "@/app/lib/period-packages";
import { formatMoney } from "@/app/lib/formatters/money";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  ProfileChip,
  ProfileInfoStat,
  profilePrimaryActionClassName,
} from "@/app/components/ui/profile-hero";

export default function PackageDetailsHero({
  item,
  clients,
  clientsAvailable = true,
  onEdit,
}: {
  item: Package;
  clients: PackageClient[];
  clientsAvailable?: boolean;
  onEdit: () => void;
}) {
  const periodBased = isPeriodPackage(item);
  const usedSessions = clients.every(client => client.activePackageId === item.id && typeof client.activePackageUsedSessions === "number" && Number.isFinite(client.activePackageUsedSessions))
    ? clients.reduce((sum, client) => sum + client.activePackageUsedSessions!, 0)
    : null;
  const estimatedRevenue = clients.length * item.price;
  const currency = item.currency || "PLN";

  return (
    <section className="card-shell p-4 md:p-6">
      <Link
        href="/owner/packages"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-muted transition hover:text-primary-light"
      >
        <ArrowLeft size={14} />
        Lista pakietów
      </Link>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light md:h-16 md:w-16">
            {periodBased ? <CalendarRange size={24} /> : <Dumbbell size={24} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <ProfileChip className={item.isActive ? "bg-tertiary/15 text-tertiary-light" : "bg-surface-container-lowest text-on-surface-muted"}>
                {item.isActive ? "Aktywny" : "Archiwalny"}
              </ProfileChip>
              <ProfileChip className="bg-surface-container-lowest text-primary-light">
                {periodBased ? "Usługa okresowa" : "Pakiet treningowy"}
              </ProfileChip>
            </div>
            <h1 className="mt-1.5 break-words font-display text-2xl font-semibold leading-tight tracking-tight md:text-[1.9rem]">
              {item.name}
            </h1>
            <p className="mt-1 max-w-[680px] break-words text-sm leading-5 text-on-surface-variant">
              {item.description || (periodBased ? "Usługa bez opisu." : "Pakiet bez opisu.")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end md:gap-3">
          <div className="md:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">{periodBased ? "Cena usługi" : "Cena pakietu"}</p>
            <p className="text-2xl font-semibold leading-tight text-primary-light">{formatMoney(item.price, currency)}</p>
          </div>
          <button type="button" onClick={onEdit} className={`${profilePrimaryActionClassName} ml-auto md:ml-0`}>
            <Pencil size={14} />
            Edytuj
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/5 pt-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-x-10">
        {!periodBased ? (
          <ProfileInfoStat icon={<Dumbbell size={13} />} label="Limit sesji">{item.sessionsLimit}</ProfileInfoStat>
        ) : null}
        <ProfileInfoStat icon={<CalendarDays size={13} />} label={periodBased ? "Czas trwania" : "Ważność"}>{item.durationDays} dni</ProfileInfoStat>
        {!periodBased && typeof item.sessionsPerWeek === "number" ? (
          <ProfileInfoStat icon={<Repeat size={13} />} label="Sesje / tydzień">{item.sessionsPerWeek}</ProfileInfoStat>
        ) : null}
        {!periodBased ? (
          <ProfileInfoStat icon={<UsersRound size={13} />} label="Uczestnicy">{item.participantsCount}</ProfileInfoStat>
        ) : null}
        <ProfileInfoStat icon={<MapPin size={13} />} label="Lokalizacja" muted={!item.locationName}>
          {item.locationName || "Bez przypisania"}
        </ProfileInfoStat>
        {!periodBased && typeof item.isPubliclyAvailable === "boolean" ? (
          <ProfileInfoStat icon={<Globe size={13} />} label="Zapisy online" muted={!item.isPubliclyAvailable}>
            {item.isPubliclyAvailable ? "Włączone" : "Wyłączone"}
          </ProfileInfoStat>
        ) : null}
        <ProfileInfoStat icon={<Users size={13} />} label="Klienci" muted={!clientsAvailable}>
          {clientsAvailable ? clients.length : "—"}
        </ProfileInfoStat>
        <ProfileInfoStat icon={<TrendingUp size={13} />} label="Szacowana wartość" muted={!clientsAvailable}>
          {clientsAvailable ? (
            <Tooltip
              align="start"
              label={periodBased
                ? "Liczba klientów × cena usługi."
                : `Liczba klientów × cena pakietu. ${usedSessions === null ? "Brak danych o wykorzystaniu." : `Wykorzystane sesje: ${usedSessions}.`}`}
            >
              <span tabIndex={0} className="focus-visible:text-primary-light focus-visible:outline-none">
                {formatMoney(estimatedRevenue, currency)}
              </span>
            </Tooltip>
          ) : (
            <Tooltip align="start" label="Brak danych o wykorzystaniu i liczbie klientów.">
              <span tabIndex={0} className="focus-visible:text-primary-light focus-visible:outline-none">—</span>
            </Tooltip>
          )}
        </ProfileInfoStat>
      </div>
    </section>
  );
}
