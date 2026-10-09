import { ApiError, backendFetch } from "../backend";

export type ActivityLogEntry = {
  id: number;
  changeSetId: string;
  createdAt: string;
  actorUserId: number | null;
  actorName: string | null;
  source: string | null;
  operation: string | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[] | null;
};

export type ActivityLogResponse = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: ActivityLogEntry[] | null;
};

// Confirmed by ActivityLogMetadataDto in the backend Swagger contract.
export type ActivityLogMetadata = {
  entityTypes: string[] | null;
  operations: string[] | null;
  sources: string[] | null;
};

export type ActivityFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
  entityType: string;
  operation: string;
  source: string;
  actorUserId: string;
  entityId: string;
  changeSetId: string;
};

export const defaultActivityFilters: ActivityFilters = {
  search: "", dateFrom: "", dateTo: "", entityType: "", operation: "",
  source: "", actorUserId: "", entityId: "", changeSetId: "",
};

export function validateActivityFilters(filters: ActivityFilters): string | null {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    return "Data końcowa nie może być wcześniejsza niż początkowa.";
  }
  const actor = filters.actorUserId.trim();
  if (actor && (!/^\d+$/.test(actor) || Number(actor) < 1 || Number(actor) > 2147483647)) {
    return "ID użytkownika musi być dodatnią liczbą całkowitą do 2147483647.";
  }
  if (filters.entityId.trim() && !filters.entityType) return "Wybierz rodzaj danych, aby wyszukać ID obiektu.";
  if (filters.changeSetId.trim() && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(filters.changeSetId.trim())) {
    return "Podaj pełny identyfikator grupy zmian w formacie UUID.";
  }
  return null;
}

// Resolve each midnight independently: DST days can have 23 or 25 hours.
export function warsawDayBoundary(value: string, nextDay = false): string {
  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day + (nextDay ? 1 : 0));
  const midnight = calendarDate.getTime();
  const offsetFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw", timeZoneName: "longOffset",
  });
  function offsetAt(instant: number) {
    const zone = offsetFormat.formatToParts(new Date(instant)).find((part) => part.type === "timeZoneName")?.value;
    const match = zone?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
    if (!match) throw new Error("Nie udało się odczytać zakresu dat. Wybierz daty ponownie.");
    return (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3]));
  }
  const offset = offsetAt(midnight - offsetAt(midnight) * 60000);
  const sign = offset < 0 ? "-" : "+";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return `${calendarDate.toISOString().slice(0, 10)}T00:00:00${sign}${hours}:${minutes}`;
}

export function getActivityLog(filters: ActivityFilters, page: number, pageSize: number, signal: AbortSignal) {
  return backendFetch<ActivityLogResponse>("activity-log", {
    method: "GET", signal,
    query: {
      page, pageSize, search: filters.search.trim().slice(0, 200),
      from: filters.dateFrom ? warsawDayBoundary(filters.dateFrom) : undefined,
      to: filters.dateTo ? warsawDayBoundary(filters.dateTo, true) : undefined,
      entityType: filters.entityType, operation: filters.operation, source: filters.source,
      actorUserId: filters.actorUserId.trim() || undefined,
      entityId: filters.entityType ? filters.entityId.trim() : undefined,
      changeSetId: filters.changeSetId.trim(),
    },
  });
}

export function getActivityLogMetadata(signal: AbortSignal) {
  return backendFetch<ActivityLogMetadata>("activity-log/metadata", { method: "GET", signal });
}

export function activityErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz dostępu do historii zmian.";
    if (error.status === 400) return "Nie udało się zastosować filtrów. Sprawdź daty i identyfikatory, a następnie spróbuj ponownie.";
  }
  return "Nie udało się pobrać historii zmian. Spróbuj ponownie.";
}
