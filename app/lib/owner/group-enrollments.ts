import { ApiError, backendGet, backendPost, getErrorMessage } from "../backend";
import type { PagedResult } from "./billing";

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

export function getGroupEnrollment(id: number) {
  return backendGet<GroupEnrollment>(`group-enrollments/${id}`);
}

// Call only after an explicit choice from backend-qualified clients and offers.
export function prepareGroupEnrollment(sessionId: number, payload: { clientId: number; packageId: number }) {
  return backendPost<GroupEnrollment>(`group-enrollments/sessions/${sessionId}`, payload);
}

export function confirmGroupEnrollment(id: number) {
  return backendPost<GroupEnrollment>(`group-enrollments/${id}/confirm`);
}

export function groupEnrollmentError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Nie masz uprawnień do obsługi tych zgłoszeń.";
    if (error.status === 404) return "Nie znaleziono zgłoszenia lub nie masz do niego dostępu.";
    if (error.status === 409) return "Warunki zgłoszenia zmieniły się. Sprawdź aktualne dane przed kolejną decyzją.";
    if (error.status === 400) return getErrorMessage(error, "Nie można potwierdzić zapisu. Sprawdź opłacenie, ważność i wejścia pakietu oraz dostępność miejsc. Opłacony pakiet pozostaje dostępny także wtedy, gdy grupa jest pełna.");
  }
  return getErrorMessage(error, "Nie udało się obsłużyć zgłoszenia. Odśwież dane przed kolejną próbą.");
}

export function groupEnrollmentStatus(value: string | null) {
  const labels: Record<string, string> = {
    AwaitingPayment: "Czeka na opłacenie pakietu", ReadyToBook: "Gotowy do potwierdzenia",
    Booked: "Zapis potwierdzony", PackageUnavailable: "Pakiet niedostępny", Unavailable: "Zapis niedostępny",
  };
  return value && Object.hasOwn(labels, value) ? labels[value] : "Status zgłoszenia niedostępny";
}
