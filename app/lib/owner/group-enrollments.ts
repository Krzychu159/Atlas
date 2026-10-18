import { ApiError, backendGet, backendPost, getErrorMessage } from "../backend";
import type { PagedResult } from "./billing";
import { getOwnerFilterOptions } from "./filter-options";
import { isSessionPackage, type PackageBillingMode } from "../period-packages";


export type GroupPackageOffer = {
  description?: string | null; sessionsPerWeek?: number; participantsCount?: number;
  locationId?: number | null; locationName?: string | null; isPubliclyAvailable?: boolean; unitPrice?: number;
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

export async function getGroupEnrollmentClients(locationId: number, search: string, signal?: AbortSignal) {
  const result = await getOwnerFilterOptions({ locationId, groupAccess: true, search, limit: 20 }, signal);
  return result.clients;
}

export async function getGroupPackageOptions(sessionId: number, clientId: number, signal?: AbortSignal) {
  const result = await backendGet<GroupPackageOptions>(`group-enrollments/sessions/${sessionId}/package-options`, { clientId }, signal);
  if (!result || !Array.isArray(result.offers) || !Array.isArray(result.ownedPackages) || [...result.offers, ...result.ownedPackages].some(item => !item || !["SessionBased", "PeriodBased"].includes(item.billingMode ?? ""))) throw new Error("Nie udało się sprawdzić rodzaju pakietów. Spróbuj ponownie.");
  // Eligibility and full offer fields come from the session-specific response.
  // Preserve explicit mode exclusions without inferring a mode from entry counts.
  const sessionBased = (item: GroupPackageOffer | GroupOwnedPackage) => isSessionPackage(item);
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
  currency?: string | null;
  packageBillingMode?: PackageBillingMode | null;
  pendingPaymentsAmount?: number;
  pendingPayments?: { paymentId: number; amount: number; currency: string | null; method: import("./billing").PaymentMethod; source: import("./billing").ClientPaymentSource; paymentDate: string; status: string }[];
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientIsArchived?: boolean | null;
  packageName?: string | null;
  packageTotalPrice?: number | null;
  packageAmountPaid?: number | null;
  packagePaymentStatus?: string | null;
  packageValidUntil?: string | null;
  packageIsActive?: boolean | null;
  packageTotalEntries?: number | null;
  packageUsedEntries?: number | null;
  sessionParticipantId?: number | null;
  attendanceStatus?: string | null;
  allowedActions?: ("Confirm" | "RecordPayment")[] | null;
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
export async function prepareGroupEnrollment(sessionId: number, payload: PrepareGroupEnrollmentPayload) {
  // Session-specific options carry billingMode and exclude period services in the UI.
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

export function groupPackageValidityLabel(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `ważny do ${new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw" }).format(date)}`
    : "Termin ważności niedostępny";
}
