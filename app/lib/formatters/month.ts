// Month values use the native <input type="month"> format: "YYYY-MM".
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseMonthValue(value: string | null | undefined) {
  const match = MONTH_PATTERN.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1 ? { year, month: Number(match[2]) } : null;
}

export function toMonthValue(year: number, month: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function shiftMonthValue(value: string, delta: number) {
  const parsed = parseMonthValue(value);
  if (!parsed) return null;
  const index = parsed.year * 12 + parsed.month - 1 + delta;
  const year = Math.floor(index / 12);
  if (year < 1 || year > 9999) return null;
  return toMonthValue(year, (index % 12) + 1);
}

// Zero-padded "YYYY-MM" strings compare correctly as text.
export function isMonthInRange(value: string, min?: string, max?: string) {
  return Boolean(parseMonthValue(value)) && (!min || value >= min) && (!max || value <= max);
}

function capitalize(text: string) {
  return text ? text.charAt(0).toLocaleUpperCase("pl-PL") + text.slice(1) : text;
}

const longMonthYear = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("pl-PL", { month: "short" });
const longMonth = new Intl.DateTimeFormat("pl-PL", { month: "long" });

// "Październik 2026"; independent of the browser language.
export function formatMonthValue(value: string | null | undefined, fallback = "Wybierz miesiąc") {
  const parsed = parseMonthValue(value);
  if (!parsed) return fallback;
  const date = new Date(2000, parsed.month - 1, 1, 12);
  date.setFullYear(parsed.year); // new Date() would map years 0–99 to 1900–1999
  return capitalize(longMonthYear.format(date));
}

export const polishMonthNames = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2024, index, 1, 12);
  return { month: index + 1, short: shortMonth.format(date).replace(".", ""), long: capitalize(longMonth.format(date)) };
});
