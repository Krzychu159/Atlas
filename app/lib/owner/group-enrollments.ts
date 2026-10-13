import { ApiError, backendGet, backendPost, getErrorMessage } from "../backend";
import type { PagedResult } from "./billing";
import type { Client } from "./clients";
import { isSessionPackage, type PackageBillingMode } from "../period-packages";
import { getPackage, getPackages, type Package } from "./packages";

export type GroupPackageOffer = {
  billingMode?: PackageBillingMode | null; packageType?: string | null;
  packageId: number; name: string | null; price: number; currency: string | null;
  sessionsLimit: number; durationDays: number; canSelect: boolean; reasons: string[] | null;
};

export type GroupOwnedPackage = {
  billingMode?: PackageBillingMode | null; packageType?: string | null;
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

export async function getGroupPackageOptions(sessionId: number, clientId: number, signal?: AbortSignal) {
  const result = await backendGet<GroupPackageOptions>(`group-enrollments/sessions/${sessionId}/package-options`, { clientId }, signal);
  if (!Array.isArray(result.offers) || !Array.isArray(result.ownedPackages)) return result;
  // The group-options DTO omits billingMode. Join actual offer metadata by packageId,
  // never by the owned clientPackageId or by entry counts/name.
  const missingIds = [...new Set([...result.offers, ...result.ownedPackages].filter(item => item.billingMode == null && item.packageType == null).map(item => item.packageId))];
  const metadata = new Map<number, Package>();
  if (missingIds.length) {
    const catalog = await getPackages(undefined, signal);
    catalog.forEach(item => metadata.set(item.id, item));
    const absent = missingIds.filter(id => !metadata.has(id));
    const details = await Promise.all(absent.map(id => getPackage(id, signal)));
    details.forEach(item => metadata.set(item.id, item));
  }
  const sessionBased = (item: GroupPackageOffer | GroupOwnedPackage) => isSessionPackage(metadata.get(item.packageId) || item);
  return { ...result, offers: result.offers.filter(sessionBased), ownedPackages: result.ownedPackages.filter(sessionBased) };
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
