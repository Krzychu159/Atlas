import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function OutlookRequiredState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[var(--radius-xl)] bg-surface-container p-6 text-center shadow-soft">
      <div className="max-w-[520px]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-surface-container-low text-primary-light">
          <CalendarDays size={30} />
        </div>
        <p className="mt-6 font-display text-2xl font-semibold">
          Połącz konto Microsoft
        </p>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Grafik korzysta z integracji Outlook. Najpierw połącz konto Microsoft
          w ustawieniach, potem wróć tutaj, żeby zobaczyć sesje.
        </p>
        <Link
          href="/owner/settings"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-container"
        >
          Przejdź do ustawień
        </Link>
      </div>
    </div>
  );
}

export function EmptyDay() {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-white/8 px-4 text-center text-sm text-on-surface-muted">
      Brak sesji
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-6 text-on-surface-variant xl:col-span-2">
      Ładowanie sesji...
    </div>
  );
}
