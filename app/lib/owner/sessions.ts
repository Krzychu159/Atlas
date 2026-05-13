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
};

export function getClientSessions(clientId: number) {
  return backendFetch<OwnerSession[]>(`Sessions/filter?ClientId=${clientId}`);
}

export function getTrainerSessions(trainerId: number) {
  return backendFetch<OwnerSession[]>(`Sessions/filter?TrainerId=${trainerId}`);
}
