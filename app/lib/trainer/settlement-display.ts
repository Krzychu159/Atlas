import { ApiError } from "../backend";
import { formatMoney } from "../formatters/money";

export function getCurrentTrainerMonth() {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric", month: "2-digit", timeZone: "Europe/Warsaw",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export function parseTrainerMonth(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  return year >= 1 && year <= 9999 ? { year, month } : null;
}

export function moveTrainerMonth(value: string, direction: number) {
  const period = parseTrainerMonth(value);
  if (!period) return value;
  const index = period.year * 12 + period.month - 1 + direction;
  const year = Math.floor(index / 12);
  if (year < 1 || year > 9999) return value;
  return `${String(year).padStart(4, "0")}-${String(index % 12 + 1).padStart(2, "0")}`;
}

export function formatSettlementMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? formatMoney(value, "PLN")
    : "Niedostępne";
}

export function formatSettlementNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value)
    : "Niedostępne";
}

export function formatSettlementDate(value: string | null | undefined) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Brak daty";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}

export function getSettlementPaymentLabel(isPaid: boolean | null | undefined) {
  return isPaid === true ? "Wypłacone" : isPaid === false ? "Niewypłacone" : "Status wypłaty niedostępny";
}

export function getSettlementErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz uprawnień do przeglądania rozliczeń.";
  }
  return "Nie udało się pobrać rozliczenia. Spróbuj ponownie.";
}
