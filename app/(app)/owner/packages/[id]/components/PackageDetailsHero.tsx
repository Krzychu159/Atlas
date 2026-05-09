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
  const usedSessions = clients.reduce(
    (sum, client) => sum + client.usedSessions,
    0,
  );

  const estimatedRevenue = clients.length * item.price;

  return (
    <div className="card-shell p-6 md:p-7 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.13),transparent_55%)]" />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
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

        <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-5">
          <div>
            <h1 className="text-[2.5rem] md:text-[3rem] leading-[0.95] font-semibold font-display tracking-tight">
              {item.name}
            </h1>

            <p className="mt-4 max-w-[520px] text-base leading-7 text-on-surface-variant">
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
            <p className="mt-4 text-label text-on-surface-muted">Przychód</p>
            <p className="mt-1 text-2xl font-semibold">
              {new Intl.NumberFormat("pl-PL", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(estimatedRevenue)}
            </p>
            <p className="mt-1 text-xs text-on-surface-muted">
              {usedSessions} wykorzystanych sesji
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
