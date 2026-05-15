import { backendFetch } from "../backend";

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

function buildSessionFilterQuery(params: SessionFilterParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.trainerId) searchParams.set("TrainerId", String(params.trainerId));
  if (params.clientId) searchParams.set("ClientId", String(params.clientId));
  if (params.locationId) searchParams.set("LocationId", String(params.locationId));
  if (params.status) searchParams.set("Status", params.status);
  if (params.from) searchParams.set("From", params.from);
  if (params.to) searchParams.set("To", params.to);

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

export function getOwnerSessions(params?: SessionFilterParams) {
  return backendFetch<OwnerSession[]>(
    `sessions/filter${buildSessionFilterQuery(params)}`,
  );
}

export function createSession(payload: SessionPayload) {
  return backendFetch<OwnerSession>("sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSession(id: number, payload: SessionPayload) {
  return backendFetch<OwnerSession>(`sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getClientSessions(clientId: number) {
  return backendFetch<OwnerSession[]>(`Sessions/filter?ClientId=${clientId}`);
}

export function getTrainerSessions(trainerId: number) {
  return backendFetch<OwnerSession[]>(`Sessions/filter?TrainerId=${trainerId}`);
}
