import type { AvailabilityRange } from "./availability";

export const STUDIO_TIME_ZONE = "Europe/Warsaw";
const DAY_MINUTES = 24 * 60;
const STEP_MINUTES = 5;
const MIN_RANGE_MINUTES = 15;

/** Minutes from midnight for "HH:mm" (00:00–24:00), otherwise null. */
export function toMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[2]) < 60 && minutes <= DAY_MINUTES ? minutes : null;
}

export function fromMinutes(minutes: number) {
  const clamped = Math.max(0, Math.min(DAY_MINUTES, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Reads what people type: "8", "830", "8:30", "8.30", "24". Returns "HH:mm" or null. */
export function normalizeTimeInput(text: string): string | null {
  const value = text.trim().replace(/[.,;\s]/g, ":");
  if (!value) return null;
  let hours: string;
  let minutes = "00";
  if (value.includes(":")) {
    const parts = value.split(":");
    if (parts.length !== 2 || !/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) return null;
    [hours, minutes] = [parts[0], parts[1].padEnd(2, "0")];
  } else if (/^\d{1,2}$/.test(value)) {
    hours = value;
  } else if (/^\d{3,4}$/.test(value)) {
    hours = value.slice(0, -2);
    minutes = value.slice(-2);
  } else {
    return null;
  }
  const normalized = `${hours.padStart(2, "0")}:${minutes}`;
  return toMinutes(normalized) === null ? null : normalized;
}

export function sortRanges(ranges: AvailabilityRange[]) {
  return [...ranges].sort((a, b) => (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0));
}

/** One message per range (null when the range is fine). */
export function validateRanges(ranges: AvailabilityRange[]): (string | null)[] {
  const errors = ranges.map((range): string | null => {
    const start = toMinutes(range.start);
    const end = toMinutes(range.end);
    if (start === null || end === null) return "Wpisz godzinę, np. 08:00.";
    if (start % STEP_MINUTES || end % STEP_MINUTES) return "Podawaj godziny co 5 minut, np. 08:05.";
    if (end <= start) return "Koniec musi być później niż początek.";
    if (end - start < MIN_RANGE_MINUTES) return "Przedział musi trwać co najmniej 15 minut.";
    return null;
  });
  const order = ranges
    .map((range, index) => ({ index, start: toMinutes(range.start), end: toMinutes(range.end) }))
    .filter((item, index) => errors[index] === null && item.start !== null && item.end !== null)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  for (let i = 1; i < order.length; i += 1) {
    if ((order[i].start ?? 0) < (order[i - 1].end ?? 0)) errors[order[i].index] = "Godziny nachodzą na inny przedział.";
  }
  return errors;
}

export function rangesAreValid(ranges: AvailabilityRange[]) {
  return validateRanges(ranges).every((error) => error === null);
}

export function sameRanges(a: AvailabilityRange[], b: AvailabilityRange[]) {
  const left = sortRanges(a);
  const right = sortRanges(b);
  return left.length === right.length && left.every((range, index) => range.start === right[index].start && range.end === right[index].end);
}

export function formatTime(value: string) {
  return value.replace(/^0(\d)/, "$1");
}

export function formatRange(range: AvailabilityRange) {
  return `${formatTime(range.start)}–${formatTime(range.end)}`;
}

export function formatRanges(ranges: AvailabilityRange[]) {
  return sortRanges(ranges).map(formatRange).join(", ");
}

/** A new range placed after the last one: one hour later, two hours long. */
export function suggestNextRange(ranges: AvailabilityRange[]): AvailabilityRange {
  const ends = ranges.map((range) => toMinutes(range.end)).filter((value): value is number => value !== null);
  if (!ends.length) return { start: "08:00", end: "12:00" };
  const start = Math.min(Math.max(...ends) + 60, DAY_MINUTES - 120);
  return { start: fromMinutes(start), end: fromMinutes(Math.min(start + 120, DAY_MINUTES)) };
}

// Date-only values (yyyy-MM-dd) are calculated in UTC, so the local time zone cannot shift the day.
function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number) {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function mondayOf(iso: string) {
  const day = parseIsoDate(iso).getUTCDay();
  return addDaysIso(iso, day === 0 ? -6 : 1 - day);
}

export function studioToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STUDIO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && toIsoDate(parseIsoDate(value)) === value);
}

const shortWeekdays = ["ndz", "pon", "wt", "śr", "czw", "pt", "sob"];
const fullWeekdays = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

/** dayOfWeek: 1 = Monday … 7 = Sunday. */
export function weekdayName(dayOfWeek: number, short = false) {
  return (short ? shortWeekdays : fullWeekdays)[dayOfWeek % 7] ?? "";
}

export function formatDayLabel(iso: string) {
  const date = parseIsoDate(iso);
  return {
    weekday: shortWeekdays[date.getUTCDay()],
    day: date.getUTCDate(),
    month: date.toLocaleDateString("pl-PL", { month: "short", timeZone: "UTC" }),
  };
}

export function formatIsoDate(iso: string, withYear = false) {
  return parseIsoDate(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
}

/** "23–29 listopada", "30 listopada – 6 grudnia", with the year when it differs from the current one. */
export function formatWeekRange(weekStart: string, currentYear = Number(studioToday().slice(0, 4))) {
  const start = parseIsoDate(weekStart);
  const endIso = addDaysIso(weekStart, 6);
  const end = parseIsoDate(endIso);
  const year = end.getUTCFullYear() !== currentYear ? ` ${end.getUTCFullYear()}` : "";
  if (start.getUTCMonth() === end.getUTCMonth()) return `${start.getUTCDate()}–${formatIsoDate(endIso)}${year}`;
  return `${formatIsoDate(weekStart)} – ${formatIsoDate(endIso)}${year}`;
}

/** "niedziela 22 listopada, 20:00" in studio time. */
export function formatStudioDateTime(utc: string | null | undefined) {
  if (!utc) return null;
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: STUDIO_TIME_ZONE });
  const time = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: STUDIO_TIME_ZONE });
  return `${day}, ${time}`;
}
