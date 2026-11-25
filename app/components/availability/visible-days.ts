import type { AvailabilityScheduleTrainer } from "@/app/lib/availability";

/** A week shows Sunday only when someone shown is actually available or busy then. */
export function visibleWeekDays(days: string[], trainers: AvailabilityScheduleTrainer[], isWeek: boolean) {
  if (!isWeek || days.length < 7) return days;
  const sunday = days[6];
  const used = trainers.some((trainer) => trainer.days.some((day) => day.date === sunday && (day.availability.length || day.busy.length)));
  return used ? days : days.slice(0, 6);
}
