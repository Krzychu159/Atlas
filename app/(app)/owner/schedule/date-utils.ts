import type { ScheduleView } from "./types";

export const dayNames = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

export const shortDayNames = ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

export function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);

  return copy;
}

export function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);

  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateControlLabel(date: Date) {
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formatDayLabel(date: Date) {
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFullDate(value: Date) {
  return value.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function getPeriod(view: ScheduleView, anchorDate: Date) {
  if (view === "day") {
    const from = startOfDay(anchorDate);
    const to = endOfDay(anchorDate);

    return {
      from,
      to,
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      label: formatFullDate(anchorDate),
    };
  }

  const from = startOfWeek(anchorDate);
  const saturday = addDays(from, 5);
  const to = endOfDay(saturday);

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    label: `${formatDayLabel(from)} - ${formatDayLabel(saturday)}`,
  };
}

export function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
