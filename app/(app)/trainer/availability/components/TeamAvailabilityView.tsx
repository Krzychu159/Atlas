"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { RetryNotice } from "@/app/components/ui/retry-notice";
import { AvailabilityGrid } from "@/app/components/availability/AvailabilityGrid";
import { TrainerStrip } from "@/app/components/availability/TrainerStrip";
import { WeekStepper } from "@/app/components/availability/WeekStepper";
import { visibleWeekDays } from "@/app/components/availability/visible-days";
import { getErrorMessage, isAbortError } from "@/app/lib/backend";
import { getAvailabilitySchedule, type AvailabilitySchedule } from "@/app/lib/availability";
import { addDaysIso, mondayOf, studioToday } from "@/app/lib/availability-time";
import { getTrainerPortalMe } from "@/app/lib/trainer/portal";

const WEEKS_AHEAD = 6;

/**
 * Read-only: availability of trainers sharing a location with this trainer, e.g. to find a substitute.
 * The backend hides who other trainers train with (their sessions come without a title).
 */
export function TeamAvailabilityView() {
  const today = studioToday();
  const thisWeek = mondayOf(today);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [locationId, setLocationId] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);
  const [result, setResult] = useState<{ key: string; data?: AvailabilitySchedule; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index)), [weekStart]);
  const key = `${weekStart}:${locationId}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    getTrainerPortalMe(controller.signal)
      .then((me) => setLocations((me.locationIds ?? []).map((id, index) => ({ value: String(id), label: me.locationNames?.[index] ?? "Lokalizacja" }))))
      .catch(() => { /* Without the list the view simply shows all of the trainer's locations. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getAvailabilitySchedule({ from: days[0], to: days[6], locationId: locationId ? Number(locationId) : undefined }, controller.signal)
      .then((data) => setResult({ key, data }))
      .catch((error) => {
        if (!isAbortError(error)) setResult({ key, error: getErrorMessage(error, "Nie udało się wczytać dyspozycji zespołu. Spróbuj ponownie.") });
      });
    return () => controller.abort();
  }, [days, locationId, key]);

  const current = result?.key === key ? result : null;
  const trainers = useMemo(() => current?.data?.trainers ?? [], [current]);
  const shownIds = useMemo(() => selectedIds.filter((id) => trainers.some((trainer) => trainer.trainerId === id)), [selectedIds, trainers]);
  const visible = useMemo(() => (shownIds.length ? trainers.filter((trainer) => shownIds.includes(trainer.trainerId)) : trainers), [shownIds, trainers]);

  return (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
        Dyspozycje trenerów z Twoich lokalizacji, np. gdy szukasz zastępstwa. Przy zajęciach innych trenerów widać tylko, że czas jest zajęty.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <WeekStepper weekStart={weekStart} minWeek={thisWeek} maxWeek={addDaysIso(thisWeek, WEEKS_AHEAD * 7)} onChange={setWeekStart} className="flex-1 sm:flex-none" />
        {locations.length > 1 ? (
          <CustomSelect ariaLabel="Lokalizacja" value={locationId} icon={<MapPin size={16} />} onChange={setLocationId} className="min-w-[14rem]"
            options={[{ value: "", label: "Wszystkie moje lokalizacje" }, ...locations]} />
        ) : null}
      </div>
      <TrainerStrip trainers={trainers} selectedIds={shownIds} onChange={setSelectedIds} loading={!current} />
      {current?.error ? (
        <RetryNotice text={current.error} onRetry={() => setAttempt((value) => value + 1)} />
      ) : (
        <AvailabilityGrid days={visibleWeekDays(days, visible, true)} trainers={visible} isLoading={!current} today={today} />
      )}
    </div>
  );
}
