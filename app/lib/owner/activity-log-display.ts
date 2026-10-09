import type { ActivityLogEntry } from "./activity-log";
import { getPaymentMethodLabel, getPaymentSourceLabel, getPaymentStatusLabel } from "../payments/display";

function lookup(labels: Record<string, string>, key: string) {
  return Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : undefined;
}

const operationLabels: Record<string, string> = {
  Created: "Utworzono", Updated: "Zmieniono", Deleted: "Usunięto",
  Archived: "Zarchiwizowano", Restored: "Przywrócono",
};
const entityLabels: Record<string, string> = {
  Client: "Klient", Trainer: "Trener", User: "Konto użytkownika", Session: "Trening",
  SessionParticipant: "Uczestnik treningu", Package: "Pakiet", ClientPackage: "Pakiet klienta",
  ClientPayment: "Płatność", ClientBalanceTransaction: "Operacja na saldzie", TrainerRate: "Stawka trenera",
  TrainerContract: "Umowa trenera", TrainerMonthlySettlement: "Rozliczenie trenera",
  ClientLocationMembership: "Lokalizacja klienta", TrainerLocation: "Lokalizacja trenera",
  TrainerContractLocation: "Lokalizacja objęta umową",
};
export const operationLabel = (value: string | null) => value ? lookup(operationLabels, value) ?? value : "Nieznana operacja";
export const entityLabel = (value: string | null) => value ? lookup(entityLabels, value) ?? value : "Nieznany rodzaj danych";
export const sourceLabel = (value: string) => lookup({ User: "Użytkownik", System: "System" }, value) ?? value;
export const actorLabel = (entry: ActivityLogEntry) => entry.source === "System" ? "System" : entry.actorName?.trim() || "Nieznana osoba";
export const objectLabel = (entry: ActivityLogEntry) => entry.entityLabel?.trim() || "Brak nazwy obiektu";

const fieldLabels: Record<string, string> = {
  id: "ID", name: "Nazwa", title: "Tytuł", description: "Opis", price: "Cena", status: "Status",
  firstName: "Imię", lastName: "Nazwisko", fullName: "Imię i nazwisko", email: "E-mail", phone: "Telefon",
  phoneNumber: "Numer telefonu", isActive: "Aktywne", isArchived: "Zarchiwizowane", isDeleted: "Usunięte",
  sessionsUsed: "Wykorzystane wejścia", usedSessions: "Wykorzystane wejścia", sessionsLimit: "Liczba wejść",
  sessionsPerWeek: "Treningi w tygodniu", durationDays: "Ważność w dniach", participantsCount: "Liczba uczestników",
  startAt: "Początek treningu", endAt: "Koniec treningu", createdAt: "Data dodania", updatedAt: "Data zmiany",
  deletedAt: "Data usunięcia", archivedAt: "Data archiwizacji", paidAt: "Data opłacenia", paymentDate: "Data płatności",
  validFrom: "Ważne od", validTo: "Ważne do", trainerId: "ID trenera", assignedTrainerId: "ID przypisanego trenera",
  clientId: "ID klienta", userId: "ID użytkownika", locationId: "ID lokalizacji", locationIds: "ID lokalizacji",
  packageId: "ID pakietu", clientPackageId: "ID pakietu klienta", sessionId: "ID treningu", currency: "Waluta",
  amount: "Kwota", totalAmount: "Łączna kwota", rate: "Stawka", balance: "Saldo", totalHours: "Łączna liczba godzin",
  totalSessions: "Łączna liczba treningów", year: "Rok", month: "Miesiąc", hours: "Godziny",
  isPubliclyAvailable: "Widoczne w ofercie", publicSlug: "Adres w ofercie", createdBy: "ID osoby dodającej",
  totalPrice: "Cena pakietu", originalPrice: "Pierwotna cena", expectedUnitPrice: "Cena za wejście",
  balanceApplied: "Wykorzystane saldo", amountPaid: "Opłacona kwota", amountDue: "Do zapłaty",
  appliedToPackageAmount: "Kwota na pakiet", balanceCreditAmount: "Kwota na saldo", refundAmount: "Kwota zwrotu",
  paymentStatus: "Status płatności", method: "Sposób płatności", source: "Źródło", note: "Notatka",
  remainingSessions: "Pozostałe wejścia", purchaseDate: "Data zakupu", validUntil: "Ważne do",
  paymentDueDate: "Termin płatności", confirmedAt: "Data potwierdzenia", rejectedAt: "Data odrzucenia",
  reversedAt: "Data cofnięcia", activatedAt: "Data aktywacji", closedAt: "Data zamknięcia",
  rejectionReason: "Powód odrzucenia", reversalReason: "Powód cofnięcia", receiptNumber: "Numer paragonu",
};
export function fieldLabel(field: string, entityType: string | null) {
  const key = field.charAt(0).toLowerCase() + field.slice(1);
  if (key === "isPaid") return entityType === "TrainerMonthlySettlement" ? "Wypłacono" : "Opłacono";
  return lookup(fieldLabels, key) ?? field.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
}

export function activityDate(value: string) {
  // The audit timestamps are UTC, including timestamps without an explicit suffix.
  const normalized = /^\d{4}-\d{2}-\d{2}T/.test(value) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? `${value}Z` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(date);
}

// Restrict financial formatting to fields whose meaning is confirmed by existing contracts.
const moneyFields: Record<string, string[]> = {
  Package: ["price"], ClientPackage: ["totalPrice", "originalPrice", "expectedUnitPrice", "balanceApplied", "amountPaid", "amountDue", "refundAmount"],
  ClientPayment: ["amount", "appliedToPackageAmount", "balanceCreditAmount"],
  ClientBalanceTransaction: ["amount"], TrainerRate: ["rate"],
  TrainerMonthlySettlement: ["totalAmount"],
};
const dateFields = new Set(["startAt", "endAt", "createdAt", "updatedAt", "deletedAt", "archivedAt", "paidAt", "paymentDate", "validFrom", "validTo", "purchaseDate", "validUntil", "paymentDueDate", "confirmedAt", "rejectedAt", "reversedAt", "activatedAt", "closedAt"]);

export function scalarValue(value: unknown, field: string, entityType: string | null, snapshot?: Record<string, unknown> | null): string {
  if (value === null || value === undefined) return "Brak wartości";
  if (typeof value === "boolean") return value ? "Tak" : "Nie";
  const key = field.charAt(0).toLowerCase() + field.slice(1);
  if (entityType === "ClientPayment" && typeof value === "number") {
    if (key === "status" && value >= 1 && value <= 5 && Number.isInteger(value)) return getPaymentStatusLabel(value);
    if (key === "method" && value >= 1 && value <= 4 && Number.isInteger(value)) return getPaymentMethodLabel(value);
    if (key === "source" && value >= 1 && value <= 3 && Number.isInteger(value)) return getPaymentSourceLabel(value);
  }
  if (entityType === "ClientPackage" && key === "paymentStatus" && typeof value === "string") {
    const label = lookup({ Unpaid: "Nieopłacone", Paid: "Opłacone", Overdue: "Po terminie", PartiallyPaid: "Częściowo opłacone", PendingConfirmation: "Oczekuje na potwierdzenie" }, value);
    if (label) return label;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const currency = snapshot?.currency ?? snapshot?.Currency;
    if (entityType && Object.prototype.hasOwnProperty.call(moneyFields, entityType) && moneyFields[entityType].includes(key) && (currency === undefined || currency === null || currency === "PLN")) {
      return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(value);
    }
    return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 20 }).format(value);
  }
  if (typeof value === "string") {
    if (dateFields.has(key) && /^\d{4}-\d{2}-\d{2}T/.test(value)) return activityDate(value);
    if (dateFields.has(key) && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join(".");
    return value === "" ? "Pusty tekst" : value;
  }
  return String(value);
}
