const zone = "Europe/Warsaw";
// Offsetless backend dates are Warsaw wall-clock values, not browser-local instants.
function dateAndZone(value: string) {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return { date: new Date(hasOffset ? value : `${value.length === 10 ? `${value}T12:00:00` : value}Z`), timeZone: hasOffset ? zone : "UTC" };
}
export function studioFormat(value: string, options: Intl.DateTimeFormatOptions) {
  const { date, timeZone } = dateAndZone(value);
  return new Intl.DateTimeFormat("pl-PL", { ...options, timeZone }).format(date);
}
export const studioTime = (value: string) => studioFormat(value, { hour: "2-digit", minute: "2-digit" });
export const studioDay = (value: string) => studioFormat(value, { weekday: "long", day: "numeric", month: "long" });
export function studioDateKey(value: string) {
  const { date, timeZone } = dateAndZone(value);
  return new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function studioNow() {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date());
  return parts.replace(" ", "T");
}
export const studioToday = () => studioNow().slice(0, 10);
export function addStudioDays(day: string, count: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function hasStarted(value: string) {
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return new Date(value).getTime() <= Date.now();
  return value.slice(0, 19) <= studioNow();
}
export function durationMinutes(start: string, end: string) {
  return Math.round((dateAndZone(end).date.getTime() - dateAndZone(start).date.getTime()) / 60000);
}
export const publicMoney = (amount: number, currency = "PLN") => new Intl.NumberFormat("pl-PL", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
