"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { RetryNotice } from "@/app/components/ui/retry-notice";
import { AvailabilityWeekEditor } from "@/app/components/availability/AvailabilityWeekEditor";
import { AvailabilityTemplateEditor } from "@/app/components/availability/AvailabilityTemplateEditor";
import { getErrorMessage, isAbortError, isNotFoundError } from "@/app/lib/backend";
import { getAvailabilityTemplates, type AvailabilityTemplates } from "@/app/lib/availability";
import { isIsoDate, mondayOf, studioToday } from "@/app/lib/availability-time";
import { WeekStepper } from "@/app/components/availability/WeekStepper";

type Tab = "week" | "template";

export default function TrainerAvailabilityPage() {
  return <Suspense><TrainerAvailabilityContent /></Suspense>;
}

function TrainerAvailabilityContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "template" ? "template" : "week";
  const requestedWeek = searchParams.get("week");
  const [data, setData] = useState<AvailabilityTemplates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAvailabilityTemplates(undefined, controller.signal)
      .then(setData)
      .catch((err) => {
        if (isAbortError(err)) return;
        // The studio does not offer availability yet; retrying will not change that.
        if (isNotFoundError(err)) setUnavailable(true);
        else setError(getErrorMessage(err, "Nie udało się wczytać dyspozycji. Spróbuj ponownie."));
      });
    return () => controller.abort();
  }, [attempt]);

  const setParams = useCallback((next: { tab?: Tab; week?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab) {
      if (next.tab === "week") params.delete("tab");
      else params.set("tab", next.tab);
    }
    if (next.week) params.set("week", next.week);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const minWeek = mondayOf(studioToday());
  const maxWeek = data ? mondayOf(data.lastPlannableDate) : minWeek;
  const weekStart = data
    ? isIsoDate(requestedWeek) && mondayOf(requestedWeek) >= minWeek && mondayOf(requestedWeek) <= maxWeek
      ? mondayOf(requestedWeek)
      : data.firstOpenWeek
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel trenera</p>
          <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-[0.95] tracking-tight md:text-[2.25rem]">Dyspozycja</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Godziny, w których możesz prowadzić zajęcia i konsultacje. Obowiązują we wszystkich Twoich lokalizacjach.
          </p>
        </div>
        <div role="tablist" aria-label="Widok dyspozycji" hidden={unavailable} className="flex gap-1 rounded-[var(--radius-lg)] bg-surface-container p-1">
          {([["week", "Tydzień"], ["template", "Stały grafik"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setParams({ tab: value })}
              className={[
                "h-10 flex-1 rounded-[var(--radius-default)] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] sm:flex-none",
                tab === value ? "bg-primary text-on-primary shadow-soft" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {error ? <RetryNotice text={error} onRetry={() => { setError(null); setAttempt((value) => value + 1); }} /> : null}
      {unavailable ? (
        <section className="card-shell flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary-light">
            <CalendarClock size={22} aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold text-on-surface">Dyspozycja nie jest jeszcze dostępna</h2>
          <p className="max-w-md text-sm leading-6 text-on-surface-variant">
            Gdy studio ją uruchomi, ustawisz tu swoje stałe godziny i będziesz potwierdzać kolejne tygodnie.
          </p>
        </section>
      ) : null}
      {!data && !error && !unavailable ? <PageSkeleton /> : null}

      {data && weekStart && tab === "week" ? (
        <>
          <WeekNavigator
            weekStart={weekStart}
            minWeek={minWeek}
            maxWeek={maxWeek}
            firstOpenWeek={data.firstOpenWeek}
            onChange={(week) => setParams({ week })}
          />
          <AvailabilityWeekEditor
            key={weekStart}
            weekStart={weekStart}
            hasTemplate={data.templates.some((template) => template.validUntil >= weekStart)}
            onOpenTemplate={() => setParams({ tab: "template" })}
          />
        </>
      ) : null}

      {data && tab === "template" ? <AvailabilityTemplateEditor data={data} onSaved={setData} /> : null}
    </div>
  );
}

function WeekNavigator({
  weekStart,
  minWeek,
  maxWeek,
  firstOpenWeek,
  onChange,
}: {
  weekStart: string;
  minWeek: string;
  maxWeek: string;
  firstOpenWeek: string;
  onChange: (week: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <WeekStepper weekStart={weekStart} minWeek={minWeek} maxWeek={maxWeek} onChange={onChange} className="flex-1 sm:flex-none" />
      {weekStart !== firstOpenWeek ? (
        <button
          type="button"
          onClick={() => onChange(firstOpenWeek)}
          className="h-12 rounded-[var(--radius-lg)] px-4 text-sm font-semibold text-primary-light transition hover:bg-surface-container focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]"
        >
          Najbliższy otwarty tydzień
        </button>
      ) : null}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div role="status" aria-label="Wczytywanie dyspozycji" className="space-y-4">
      <div className="h-12 w-72 max-w-full animate-pulse rounded-[var(--radius-lg)] bg-surface-container motion-reduce:animate-none" aria-hidden="true" />
      <div className="card-shell h-24 animate-pulse bg-surface-container motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">Wczytywanie dyspozycji…</span>
    </div>
  );
}
