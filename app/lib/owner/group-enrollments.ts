import { ApiError, backendGet, backendPost, getErrorMessage } from "../backend";
import type { PagedResult } from "./billing";
import type { Client } from "./clients";

export type GroupPackageOffer = {
  packageId: number; name: string | null; price: number; currency: string | null;
  sessionsLimit: number; durationDays: number; canSelect: boolean; reasons: string[] | null;
};

export type GroupOwnedPackage = {
  clientPackageId: number; packageId: number; name: string | null; price: number; currency: string | null;
  amountDue: number; locationId: number | null; validUntil: string | null; paymentStatus: string | null;
  isActive: boolean; totalEntries: number; usedEntries: number; reservedEntries: number;
  availableEntries: number; isEligible: boolean; canSelect: boolean; reasons: string[] | null;
};

export type GroupPackageOptions = {
  sessionId: number; clientId: number; locationId: number; sessionStartAt: string;
  offers: GroupPackageOffer[]; ownedPackages: GroupOwnedPackage[];
};

export type PrepareGroupEnrollmentPayload = { clientId: number; packageId: number; clientPackageId?: number };

export function getGroupEnrollmentClients(locationId: number, search: string, signal?: AbortSignal) {
  return backendGet<Client[]>("clients/filter", { locationId, groupAccessEnabled: true, search }, signal);
}

export function getGroupPackageOptions(sessionId: number, clientId: number, signal?: AbortSignal) {
  return backendGet<GroupPackageOptions>(`group-enrollments/sessions/${sessionId}/package-options`, { clientId }, signal);
}

export function groupPackageReason(code: string) {
  const labels: Record<string, string> = {
    LocationMismatch: "Pakiet nie obowiązuje w tej lokalizacji.", Closed: "Pakiet został zamknięty.",
    ExpiredOnSessionDate: "Pakiet traci ważność przed terminem zajęć.", NoAvailableEntries: "Brak dostępnych wejść w pakiecie.",
    Inactive: "Pakiet jest nieaktywny.", PaymentRequired: "Pakiet wymaga opłacenia.",
    OfferUnavailable: "Oferta jest niedostępna.", ValidityTooShortFromToday: "Ważność nowego pakietu nie obejmie terminu zajęć.",
  };
  return Object.hasOwn(labels, code) ? labels[code] : "Pakiet nie spełnia wszystkich warunków wyboru";
}

export type GroupEnrollment = {
  id: number;
  sessionId: number;
  clientId: number;
  clientPackageId: number;
  status: string | null;
  amountDue: number;
  reservesSeat: boolean;
};

export function getGroupEnrollments(sessionId: number, page = 1, signal?: AbortSignal) {
  return backendGet<PagedResult<GroupEnrollment>>(`group-enrollments/sessions/${sessionId}`, { page, pageSize: 25 }, signal);
}

export function getGroupEnrollment(id: number, signal?: AbortSignal) {
  return backendGet<GroupEnrollment>(`group-enrollments/${id}`, undefined, signal);
}

// packageId identifies the offer; clientPackageId optionally selects an owned package.
// Omitting clientPackageId allows the backend to reuse an existing package of that offer.
export function prepareGroupEnrollment(sessionId: number, payload: PrepareGroupEnrollmentPayload) {
  return backendPost<GroupEnrollment>(`group-enrollments/sessions/${sessionId}`, payload);
}

export function confirmGroupEnrollment(id: number) {
  return backendPost<GroupEnrollment>(`group-enrollments/${id}/confirm`);
}

export function groupEnrollmentError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz uprawnień do obsługi tych zgłoszeń.";
    if (error.status === 404) return "Nie znaleziono zgłoszenia lub nie masz do niego dostępu.";
    if (error.status === 409) return getErrorMessage(error, "Warunki zapisu zmieniły się. Sprawdź miejsca i pakiet.");
    if (error.status === 400) return getErrorMessage(error, "Nie można teraz potwierdzić udziału. Sprawdź pakiet i wolne miejsca.");
  }
  return getErrorMessage(error, "Nie udało się obsłużyć zgłoszenia. Spróbuj ponownie.");
}

export function groupEnrollmentStatus(value: string | null) {
  const labels: Record<string, string> = {
    AwaitingPayment: "Oczekuje na płatność", ReadyToBook: "Gotowy do potwierdzenia",
    Booked: "Zapis potwierdzony", PackageUnavailable: "Pakiet niedostępny", Unavailable: "Zapis niedostępny",
  };
  return value && Object.hasOwn(labels, value) ? labels[value] : "Status zgłoszenia niedostępny";
}
