import { CalendarDays, Dumbbell, TrendingUp, Users } from "lucide-react";
import type { Package, PackageClient } from "@/app/lib/owner/packages";

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency || "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PackageDetailsHero({
  item,
  clients,
}: {
  item: Package;
  clients: PackageClient[];
}) {
  const usedSessions = clients.every(client => client.activePackageId === item.id && typeof client.activePackageUsedSessions === "number" && Number.isFinite(client.activePackageUsedSessions))
    ? clients.reduce((sum, client) => sum + client.activePackageUsedSessions!, 0)
    : null;

  const estimatedRevenue = clients.length * item.price;

  return (
    <div className="card-shell p-6 md:p-7 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.13),transparent_55%)]" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em] ${
              item.isActive
                ? "bg-tertiary-container text-tertiary-light"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {item.isActive ? "Aktywny" : "Archiwalny"}
          </span>

          <span className="text-label text-on-surface-variant">
            Pakiet treningowy
          </span>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <h1 className="break-words font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl xl:text-5xl">
              {item.name}
            </h1>

            <p className="mt-3 max-w-[640px] break-words text-sm leading-6 text-on-surface-variant sm:text-base">
              {item.description || "Pakiet bez opisu."}
            </p>
          </div>

          <div className="md:text-right">
            <p className="text-label text-on-surface-variant">Cena pakietu</p>
            <p className="mt-2 text-[2.2rem] leading-none font-semibold text-primary-light">
              {formatPrice(item.price, item.currency)}
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
            <Dumbbell size={18} className="text-primary-light" />
            <p className="mt-4 text-label text-on-surface-muted">Limit sesji</p>
            <p className="mt-1 text-2xl font-semibold">{item.sessionsLimit}</p>
          </div>

          <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
            <CalendarDays size={18} className="text-primary-light" />
            <p className="mt-4 text-label text-on-surface-muted">Ważność</p>
            <p className="mt-1 text-2xl font-semibold">
              {item.durationDays} dni
            </p>
          </div>

          <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
            <Users size={18} className="text-primary-light" />
            <p className="mt-4 text-label text-on-surface-muted">Klienci</p>
            <p className="mt-1 text-2xl font-semibold">{clients.length}</p>
          </div>

          <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
            <TrendingUp size={18} className="text-tertiary-light" />
            <p className="mt-4 text-label text-on-surface-muted">Szacowana wartość</p>
            <p className="mt-1 text-2xl font-semibold">
              {new Intl.NumberFormat("pl-PL", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(estimatedRevenue)} {item.currency || "PLN"}
            </p>
            <p className="mt-1 text-xs text-on-surface-muted">
              {usedSessions === null ? "Brak danych o wykorzystaniu" : `${usedSessions} wykorzystanych sesji`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
