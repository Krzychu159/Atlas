import { BadgeCheck, Coins } from "lucide-react";
import type { TrainerRate } from "@/app/lib/owner/settlements";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "bez końca";

  return new Date(value).toLocaleDateString("pl-PL");
}

export default function TrainerProfileRates({
  rates,
}: {
  rates: TrainerRate[];
}) {
  const activeRates = rates.filter((rate) => rate.isActive);

  return (
    <section className="card-shell p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-section-title">Stawka</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Aktualne stawki godzinowe według typu sesji.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-primary-light">
          <Coins size={20} />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {rates.length > 0 ? (
          rates.map((rate) => (
            <div
              key={rate.id}
              className="rounded-[var(--radius-lg)] bg-surface-container-low p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    {rate.sessionType || "Stawka domyślna"}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-muted">
                    Od {formatDate(rate.validFrom)} do {formatDate(rate.validTo)}
                  </p>
                </div>
                <p className="text-lg font-semibold text-tertiary-light">
                  {formatMoney(rate.rate)}
                </p>
              </div>

              {rate.isActive ? (
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-tertiary-container px-3 py-1 text-xs font-semibold text-tertiary-light">
                  <BadgeCheck size={14} />
                  Aktywna
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
            Brak stawek z API dla tego trenera.
          </div>
        )}
      </div>

      {activeRates.length > 1 ? (
        <p className="mt-4 text-xs text-on-surface-muted">
          Trener ma kilka aktywnych stawek, dlatego rozliczenie liczy kwoty per
          typ sesji.
        </p>
      ) : null}
    </section>
  );
}
