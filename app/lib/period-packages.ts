import { ApiError, getErrorMessage } from "./backend";
import { formatMoney } from "./formatters/money";

export type PackageBillingMode = "SessionBased" | "PeriodBased";
type BillingModeFields = { billingMode?: string | null; packageType?: string | null };

export function isPeriodPackage(item: BillingModeFields) {
  return item.billingMode === "PeriodBased" || item.packageType === "PeriodBased";
}

// Missing billingMode belongs to the legacy session contract. Unknown modes are not training packages.
export function isSessionPackage(item: BillingModeFields) {
  return !isPeriodPackage(item) && (item.billingMode == null || item.billingMode === "SessionBased");
}

export const packageBillingModeOptions = [
  { value: "SessionBased", label: "Pakiet treningowy — rozliczany wejściami" },
  { value: "PeriodBased", label: "Usługa okresowa — rozliczana czasem" },
];

export function periodStatusLabel(status?: string | null) {
  const labels: Record<string, string> = { Scheduled: "Zaplanowana", Active: "Aktywna", Expired: "Zakończona", Closed: "Zamknięta", Inactive: "Nieaktywna" };
  return status && Object.hasOwn(labels, status) ? labels[status] : "Status niedostępny";
}

export function formatPeriodAmount(amount: number | null | undefined, currency?: string | null) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "Kwota niedostępna";
  return currency ? formatMoney(amount, currency) : `${new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} (waluta niepodana)`;
}

export function calendarDateIsValid(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function warsawCalendarDate(value: string | Date): string | null {
  if (typeof value === "string") {
    // Calendar dates and offset-free boundaries are Polish wall time, never local-browser time or UTC.
    if (/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(value)) {
      const day = value.slice(0, 10);
      return calendarDateIsValid(day) ? day : null;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

function displayDay(day: string) {
  return day.split("-").reverse().join(".");
}

export function periodRangeLabel(start?: string | null, exclusiveEnd?: string | null) {
  if (!start || !exclusiveEnd) return "Okres niedostępny";
  const first = warsawCalendarDate(start);
  const end = warsawCalendarDate(exclusiveEnd);
  if (!first || !end || end <= first) return "Okres niedostępny";
  // Subtract a calendar day from the Warsaw boundary, not 24 hours from an instant (DST).
  const [year, month, day] = end.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
  return `${displayDay(first)} – ${displayDay(lastDay)}`;
}

export function canChangePeriodRenewal(item: { periodStatus?: string | null; validUntil?: string | null; closedAt?: string | null; closureDisposition?: string | null }, today: string | null) {
  const end = item.validUntil ? warsawCalendarDate(item.validUntil) : null;
  return Boolean(end && today && end > today && !item.closedAt && !item.closureDisposition && ["Scheduled", "Active", "Inactive"].includes(item.periodStatus || ""));
}

export function periodPackageError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return getErrorMessage(error, "Sprawdź datę rozpoczęcia, lokalizację i pozostałe dane. Okresy tej samej usługi nie mogą się nakładać.");
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz uprawnień do zarządzania tą usługą.";
    if (error.status === 404) return "Nie znaleziono usługi lub nie masz do niej dostępu. Odśwież dane.";
    if (error.status === 409) return "Dane usługi zmieniły się. Odśwież dane i sprawdź je przed ponownym zatwierdzeniem.";
  }
  return getErrorMessage(error, "Nie udało się zapisać zmiany usługi. Odśwież dane przed kolejną próbą.");
}
