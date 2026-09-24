import { backendGet, backendPost, backendPut } from "../backend";

export type OwnerSessionParticipant = {
  id: number;
  clientId: number;
  clientFullName: string | null;
  packageId: number | null;
  packageName: string | null;
  clientPackageId: number | null;
  attendanceStatus: string | null;
  countsAgainstPackage: boolean;
  isCountedFromPackage: boolean;
  sessionsCharged: number;
  plannedBillingType: string | null;
  actualBillingType: string | null;
  expectedUnitPrice: number;
  actualUnitPrice: number;
  balanceDifference: number;
  note: string | null;
};

export type OwnerSession = {
  isPubliclyBookable?: boolean;
  publicSlug?: string | null;
  publicCapacity?: number | null;
  id: number;
  title: string | null;
  note: string | null;
  startAt: string;
  endAt: string;
  trainerId: number;
  trainerFullName: string | null;
  locationId: number;
  locationName: string | null;
  status: string | null;
  plannedSessionType: string | null;
  actualSessionType: string | null;
  actualParticipantsCount: number | null;
  completedAt: string | null;
  participantsCount: number;
  clientsDisplayName: string | null;
  participants: OwnerSessionParticipant[] | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  locationParticipantsCount?: number;
  locationLimit?: number;
  isLocationLimitExceeded?: boolean;
  outlookCategories?: string[] | null;
  primaryOutlookCategory?: string | null;
  primaryOutlookCategoryColor?: string | null;
  outlookCategoryColors?: { name: string; color: string | null }[] | null;
};

type SessionFilterParams = {
  trainerId?: number;
  clientId?: number;
  locationId?: number;
  status?: string;
  from?: string;
  to?: string;
};

export type SessionParticipantPayload = {
  clientId: number;
  countsAgainstPackage: boolean;
  sessionsCharged: number;
  note?: string | null;
};

export type SessionPayload = {
  isPubliclyBookable?: boolean;
  publicSlug?: string | null;
  publicCapacity?: number | null;
  title?: string | null;
  note?: string | null;
  startAt: string;
  endAt: string;
  trainerId: number;
  locationId: number;
  status?: string | null;
  plannedSessionType?: string | null;
  outlookCategories?: string[] | null;
  participants?: SessionParticipantPayload[] | null;
};

export function getOwnerSessions(params?: SessionFilterParams) {
  return backendGet<OwnerSession[]>("sessions/filter", {
    TrainerId: params?.trainerId,
    ClientId: params?.clientId,
    LocationId: params?.locationId,
    Status: params?.status,
    From: params?.from,
    To: params?.to,
  });
}

export function createSession(payload: SessionPayload) {
  return backendPost<OwnerSession>("sessions", payload);
}

export type SessionRecurrence = {
  frequency: "Daily" | "Weekly";
  interval: number;
  daysOfWeek: string[];
  occurrencesCount: number | null;
  endDate: string | null;
};

export function createSessionSeries(session: SessionPayload, recurrence: SessionRecurrence) {
  return backendPost<{
    recurringGroupId: string;
    frequency: SessionRecurrence["frequency"];
    interval: number;
    occurrencesCount: number;
    outlookSeriesSynced: boolean;
    outlookSyncWarning: string | null;
    sessions: OwnerSession[];
  }>("sessions/series", { session, recurrence });
}

export function updateSession(id: number, payload: SessionPayload) {
  return backendPut<OwnerSession>(`sessions/${id}`, payload);
}

export function getClientSessions(clientId: number) {
  return backendGet<OwnerSession[]>("Sessions/filter", { ClientId: clientId });
}

export function getTrainerSessions(trainerId: number) {
  return backendGet<OwnerSession[]>("Sessions/filter", {
    TrainerId: trainerId,
  });
}
