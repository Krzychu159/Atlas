import type { PublicGroupClass } from "./group-classes";
import { hasStarted, studioDateKey, studioTime } from "./studio-date";

export function classesForDay(items: PublicGroupClass[], day: string, locationId: number | null) {
  const sorted = items.filter((item) => item.locationId === locationId).slice().sort((a, b) =>
    `${studioDateKey(a.startAt)}T${studioTime(a.startAt)}`.localeCompare(`${studioDateKey(b.startAt)}T${studioTime(b.startAt)}`));
  return {
    selected: sorted.filter((item) => studioDateKey(item.startAt) === day),
    upcoming: sorted.filter((item) => studioDateKey(item.startAt) > day && !hasStarted(item.startAt) && !item.isFullyBooked && item.availableSeats > 0).slice(0, 3),
  };
}
