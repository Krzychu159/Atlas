// Values keep the native input formats: "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm[:ss[.mmm]]".
// The visible text is always Polish: "21.10.2026" and "21.10.2026, 18:00".
const DATE_VALUE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_VALUE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(:\d{2}(?:\.\d{1,3})?)?$/;

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function isRealDate(year: number, month: number, day: number) {
  return year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function parseDateValue(value: string | null | undefined) {
  const match = DATE_VALUE.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return isRealDate(year, month, day) ? { year, month, day } : null;
}

export function toDateValue(year: number, month: number, day: number) {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function splitDateTimeValue(value: string | null | undefined) {
  const match = DATE_TIME_VALUE.exec(value ?? "");
  if (!match || !parseDateValue(match[1])) return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return null;
  return { date: match[1], hour, minute, time: `${match[2]}:${match[3]}` };
}

export function formatDateValue(value: string | null | undefined) {
  const parsed = parseDateValue(value);
  return parsed ? `${pad(parsed.day)}.${pad(parsed.month)}.${pad(parsed.year, 4)}` : "";
}

export function formatDateTimeValue(value: string | null | undefined) {
  const parts = splitDateTimeValue(value);
  return parts ? `${formatDateValue(parts.date)}, ${parts.time}` : "";
}

// Accepts 21.10.2026, 21-10-2026, 21/10/2026, 21 10 2026, 21102026, 2026-10-21 and two-digit years (20xx).
export function parseDateText(text: string): string | null {
  const value = text.trim();
  if (!value) return "";
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const match = /^(\d{1,2})[.\-/ ](\d{1,2})[.\-/ ](\d{4}|\d{2})$/.exec(value) ?? /^(\d{2})(\d{2})(\d{4}|\d{2})$/.exec(value);
  let year: number, month: number, day: number;
  if (iso) [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (match) [day, month, year] = [Number(match[1]), Number(match[2]), match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])];
  else return null;
  return isRealDate(year, month, day) ? toDateValue(year, month, day) : null;
}

// Accepts 18:00, 18.00, 1800, 800 and 18.
export function parseTimeText(text: string): string | null {
  const value = text.trim();
  const separated = /^(\d{1,2})[:.](\d{2})$/.exec(value);
  let hour: number, minute: number;
  if (separated) [hour, minute] = [Number(separated[1]), Number(separated[2])];
  else if (/^\d{1,2}$/.test(value)) [hour, minute] = [Number(value), 0];
  else if (/^\d{3,4}$/.test(value)) [hour, minute] = [Number(value.slice(0, -2)), Number(value.slice(-2))];
  else return null;
  return hour <= 23 && minute <= 59 ? `${pad(hour)}:${pad(minute)}` : null;
}

// "21.10.2026, 18:00" / "21.10.2026 18:00". Without a time the previous one (or 00:00) is kept.
export function parseDateTimeText(text: string, previous = ""): string | null {
  const value = text.trim();
  if (!value) return "";
  const old = splitDateTimeValue(previous);
  const withTime = /^(.+?)(?:\s*[,T]\s*|\s+)(\d{1,2}[:.]\d{2}|\d{1,4})$/.exec(value);
  let date = withTime ? parseDateText(withTime[1]) : null;
  let time = date && withTime ? parseTimeText(withTime[2]) : null;
  if (!date || !time) {
    // No valid time part: the whole text is a date and the previous time is kept.
    date = parseDateText(value);
    time = old?.time ?? "00:00";
  }
  if (!date) return null;
  // Seconds of an unchanged moment are kept (exact payment times); a new moment starts at :00.
  return old && old.date === date && old.time === time ? previous : `${date}T${time}`;
}

// Native min/max strings compare as text once both have the same precision.
export function isWithinBounds(value: string, min?: string, max?: string) {
  if (!value) return true;
  const comparable = (bound: string) => value.slice(0, bound.length);
  return (!min || comparable(min) >= min.slice(0, value.length)) && (!max || comparable(max) <= max);
}

export type CalendarDay = { value: string; day: number; inMonth: boolean };

function utcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(2000, month - 1, day, 12));
  date.setUTCFullYear(year); // Date.UTC maps years 0–99 to 1900–1999
  return date;
}

// Six Monday-first weeks covering the month, as in Polish calendars.
export function calendarMonthDays(year: number, month: number): CalendarDay[] {
  const first = utcDate(year, month, 1);
  const offset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(1 - offset + index);
    return {
      value: toDateValue(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month - 1,
    };
  });
}

export function shiftDateValue(value: string, days: number) {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  const date = utcDate(parsed.year, parsed.month, parsed.day);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  return year >= 1 && year <= 9999 ? toDateValue(year, date.getUTCMonth() + 1, date.getUTCDate()) : null;
}

// Same day number in another month, clamped to that month's length (31.01 → 28/29.02).
export function shiftDateMonths(value: string, months: number) {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  const index = parsed.year * 12 + parsed.month - 1 + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  if (year < 1 || year > 9999) return null;
  return toDateValue(year, month, Math.min(parsed.day, daysInMonth(year, month)));
}

export function todayDateValue(now = new Date()) {
  return toDateValue(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const longDay = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthTitle = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" });

// "środa, 21 października 2026" — the accessible name of a calendar day.
export function formatDayLabel(value: string) {
  const parsed = parseDateValue(value);
  return parsed ? longDay.format(utcDate(parsed.year, parsed.month, parsed.day)) : value;
}

export function formatCalendarTitle(year: number, month: number) {
  const text = monthTitle.format(utcDate(year, month, 1));
  return text.charAt(0).toLocaleUpperCase("pl-PL") + text.slice(1);
}

export const polishWeekdays = [
  { short: "pn", long: "poniedziałek" }, { short: "wt", long: "wtorek" }, { short: "śr", long: "środa" },
  { short: "cz", long: "czwartek" }, { short: "pt", long: "piątek" }, { short: "so", long: "sobota" }, { short: "nd", long: "niedziela" },
];
