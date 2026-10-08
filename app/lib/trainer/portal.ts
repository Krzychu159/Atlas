import { backendGet, backendPatch, backendPost, backendPut } from "../backend";
import type {
  ClientSubscription,
  ClientTrainingPlan,
  SubscriptionUsage,
  UpdateClientTrainingPlanPayload,
} from "../owner/clients";
import type { ClientBillingSummary, ClientPayment, CreateClientPaymentPayload } from "../owner/billing";
import type { OutlookSessionColors } from "../calendar/outlook-colors";

export type TrainerPortalMe = {
  trainerId: number;
  userId: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  status: string | null;
  experienceYears: number;
  locationIds: number[] | null;
  locationNames: string[] | null;
  outlookCategoryName?: string | null;
};

export type TrainerPortalSession = OutlookSessionColors & {
  outlookCategories?: string[] | null;
  sessionId: number;
  trainerId: number;
  trainerFullName: string;
  canEdit: boolean;
  title: string | null;
  note: string | null;
  startAt: string;
  endAt: string;
  clientFullName: string | null;
  locationName: string | null;
  status: string | null;
};

export type TrainerSessionParticipantPayload = {
  clientId: number;
  countsAgainstPackage: boolean;
  sessionsCharged: number;
  note: string | null;
};

export type TrainerSessionParticipant = {
  id: number;
  clientId: number;
  clientFullName: string;
  packageId: number | null;
  packageName: string | null;
  clientPackageId: number | null;
  attendanceStatus: string;
  countsAgainstPackage: boolean;
  isCountedFromPackage: boolean;
  sessionsCharged: number;
  plannedBillingType: string | null;
  actualBillingType: string | null;
  expectedUnitPrice: number | null;
  actualUnitPrice: number | null;
  balanceDifference: number | null;
  note: string | null;
};

export type TrainerSessionDetails = OutlookSessionColors & {
  id: number;
  title: string;
  note: string | null;
  startAt: string;
  endAt: string;
  trainerId: number;
  trainerFullName: string;
  canEdit: boolean;
  locationId: number | null;
  locationName: string | null;
  status: string;
  isPubliclyBookable: boolean;
  publicSlug: string | null;
  publicCapacity: number | null;
  publicAvailableSpots: number | null;
  plannedSessionType: string | null;
  actualSessionType: string | null;
  actualParticipantsCount: number | null;
  completedAt: string | null;
  participantsCount: number;
  clientsDisplayName: string | null;
  participants: TrainerSessionParticipant[];
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  locationParticipantsCount: number;
  locationLimit: number;
  isLocationLimitExceeded: boolean;
  outlookCategories: string[];
  isRecurring: boolean;
  recurringGroupId: string | null;
  recurrenceInstanceNumber: number | null;
};

export type TrainerSessionPayload = {
  title: string;
  note: string | null;
  startAt: string;
  endAt: string;
  trainerId: number;
  locationId: number;
  status: string;
  isPubliclyBookable: boolean;
  publicSlug: string | null;
  publicCapacity: number | null;
  plannedSessionType: string | null;
  outlookCategories: string[];
  participants: TrainerSessionParticipantPayload[];
};

export type UpdateTrainerSessionPayload = TrainerSessionPayload & { correctionReason: string | null };

export type TrainerPortalClient = {
  clientId: number;
  activePackageId?: number | null;
  activeClientPackageId?: number | null;
  activeClientPackageName?: string | null;
  activePackageTotalSessions?: number | null;
  activePackageUsedSessions?: number | null;
  activePackageRemainingSessions?: number | null;
  activePackagePaymentStatus?: string | null;
  fullName: string | null;
  email: string | null;
  emailContactUrl: string | null;
  phoneNumber: string | null;
  phoneContactUrl: string | null;
  avatarUrl: string | null;
  goal: string | null;
  status: string | null;
  billingStatus: string | null;
  hasActivePackage?: boolean | null;
  isPackageActive?: boolean | null;
  activePackageName?: string | null;
  currentPackageName?: string | null;
  packageName?: string | null;
  packageSessionsUsed?: number | null;
  packageSessionsLimit?: number | null;
  usedSessions?: number | null;
  sessionsUsed?: number | null;
  sessionsLimit?: number | null;
  remainingSessions?: number | null;
  balance?: number | null;
  balanceAmount?: number | null;
  accountBalance?: number | null;
  currentBalance?: number | null;
  billingBalance?: number | null;
  currency?: string | null;
  balanceCurrency?: string | null;
  trainingStartDate?: string | null;
  locationName: string | null;
  createdAt: string;
};

export type TrainerPortalClientDetails = {
  id: number;
  trainerId: number | null;
  activePackageId: number | null;
  activeClientPackageId?: number | null;
  activeClientPackageName?: string | null;
  activePackageTotalSessions?: number | null;
  activePackageUsedSessions?: number | null;
  activePackageRemainingSessions?: number | null;
  activePackagePaymentStatus?: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  emailContactUrl: string | null;
  phoneNumber: string | null;
  phoneContactUrl: string | null;
  avatarUrl: string | null;
  goal: string | null;
  notes: string | null;
  billingStatus: string | null;
  status: string | null;
  hasActivePackage?: boolean | null;
  isPackageActive?: boolean | null;
  activePackageName?: string | null;
  currentPackageName?: string | null;
  packageName?: string | null;
  packageSessionsUsed?: number | null;
  packageSessionsLimit?: number | null;
  usedSessions?: number | null;
  sessionsUsed?: number | null;
  sessionsLimit?: number | null;
  remainingSessions?: number | null;
  balance?: number | null;
  balanceAmount?: number | null;
  accountBalance?: number | null;
  currentBalance?: number | null;
  billingBalance?: number | null;
  currency?: string | null;
  balanceCurrency?: string | null;
  trainingStartDate?: string | null;
  nextSessionAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  trainerFullName: string | null;
  locationId: number;
  locationName: string | null;
};

export type UpdateTrainerClientPayload = {
  trainerId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  goal?: string | null;
  notes?: string | null;
  billingStatus?: string | null;
  status?: string | null;
  trainingStartDate?: string | null;
  nextSessionAt?: string | null;
  locationId?: number;
};

export type TrainerPortalDashboard = {
  me: TrainerPortalMe | null;
  activeClientsCount: number;
  todaySessionsCount: number;
  upcomingSessionsCount: number;
  todaySessions: TrainerPortalSession[] | null;
  upcomingSessions: TrainerPortalSession[] | null;
  recentClients: TrainerPortalClient[] | null;
};

export type UpdateTrainerPortalProfilePayload = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  experienceYears?: number;
};

export function getTrainerPortalDashboard() {
  return backendGet<TrainerPortalDashboard>("trainer-portal/dashboard");
}

export type TrainerPortalSettlementItem = {
  sessionId: number;
  startAt: string;
  endAt: string;
  title: string;
  sessionType: string;
  locationId: number | null;
  locationName: string;
  isCoveredByContract: boolean;
  contractId: number | null;
  contractNumber: string | null;
  hours: number;
  rate: number;
  rateType: string;
  amount: number;
  participantsCount: number;
};

export type TrainerPortalSettlement = {
  trainerId: number;
  // The supplied Swagger example does not establish location nullability.
  locationId: number | null;
  trainerFullName: string;
  year: number;
  month: number;
  totalHours: number;
  totalSessions: number;
  totalAmount: number;
  contractedTotalHours: number;
  contractedTotalSessions: number;
  contractedTotalAmount: number;
  nonContractedTotalHours: number;
  nonContractedTotalSessions: number;
  isPaid: boolean;
  paidAt: string | null;
  items: TrainerPortalSettlementItem[];
  nonContractedItems: TrainerPortalSettlementItem[];
};

export function getTrainerPortalSettlement(year: number, month: number) {
  return backendGet<TrainerPortalSettlement | null>("trainer-portal/settlement", {
    year,
    month,
  });
}

export function getTrainerPortalClients() {
  return backendGet<TrainerPortalClient[]>("trainer-portal/clients");
}

export function getTrainerPortalClient(clientId: number) {
  return backendGet<TrainerPortalClientDetails>(
    `trainer-portal/clients/${clientId}`,
  );
}

export function updateTrainerPortalClient(
  clientId: number,
  payload: UpdateTrainerClientPayload,
) {
  return backendPatch<TrainerPortalClientDetails>(
    `trainer-portal/clients/${clientId}`,
    payload,
  );
}

export function getTrainerPortalSessions() {
  return backendGet<TrainerPortalSession[]>("trainer-portal/sessions");
}

export function getTrainerPortalSession(sessionId: number) {
  return backendGet<TrainerSessionDetails>(`trainer-portal/sessions/${sessionId}`);
}

export function createTrainerPortalSession(payload: TrainerSessionPayload) {
  return backendPost<unknown>("trainer-portal/sessions", payload);
}

export function updateTrainerPortalSession(
  sessionId: number,
  payload: UpdateTrainerSessionPayload,
) {
  return backendPut<unknown>(
    `trainer-portal/sessions/${sessionId}`,
    payload,
  );
}

export function getTrainerPortalMe() {
  return backendGet<TrainerPortalMe>("trainer-portal/me");
}

export function updateTrainerPortalMe(
  payload: UpdateTrainerPortalProfilePayload,
) {
  return backendPatch<TrainerPortalMe>("trainer-portal/me", payload);
}

export function getTrainerPortalClientSubscription(clientId: number) {
  return backendGet<ClientSubscription>(
    `trainer-portal/clients/${clientId}/subscription`,
  );
}

export function setTrainerPortalClientNextPackage(
  clientId: number,
  packageId: number,
) {
  return backendPut<ClientSubscription>(
    `trainer-portal/clients/${clientId}/subscription/next-package`,
    { packageId },
  );
}

export function cancelTrainerPortalClientSubscription(clientId: number) {
  return backendPost<ClientSubscription>(
    `trainer-portal/clients/${clientId}/subscription/cancel`,
  );
}

export function resumeTrainerPortalClientSubscription(clientId: number) {
  return backendPost<ClientSubscription>(
    `trainer-portal/clients/${clientId}/subscription/resume`,
  );
}

export function getTrainerPortalClientSubscriptionUsage(clientId: number) {
  return backendGet<SubscriptionUsage>(
    `trainer-portal/clients/${clientId}/subscription/current-cycle/usage`,
  );
}

export function getTrainerPortalClientBilling(clientId: number) {
  return backendGet<ClientBillingSummary>(
    `trainer-portal/clients/${clientId}/billing`,
  );
}

export function createTrainerPortalClientPayment(
  clientId: number,
  payload: CreateClientPaymentPayload,
) {
  return backendPost<ClientPayment>(
    `trainer-portal/clients/${clientId}/payments`,
    payload,
  );
}

export function getTrainerPortalPendingPayments() {
  return backendGet<ClientPayment[]>("trainer-portal/payments/pending");
}

export function confirmTrainerPortalPayment(paymentId: number) {
  return backendPost<ClientPayment>(
    `trainer-portal/payments/${paymentId}/confirm`,
  );
}

export function rejectTrainerPortalPayment(paymentId: number, reason?: string) {
  return backendPost<ClientPayment>(
    `trainer-portal/payments/${paymentId}/reject`,
    { reason: reason || null },
  );
}

export function getTrainerPortalClientTrainingPlan(clientId: number) {
  return backendGet<ClientTrainingPlan>(
    `trainer-portal/clients/${clientId}/training-plan`,
  );
}

export function updateTrainerPortalClientTrainingPlan(
  clientId: number,
  payload: UpdateClientTrainingPlanPayload,
) {
  return backendPut<ClientTrainingPlan>(
    `trainer-portal/clients/${clientId}/training-plan`,
    payload,
  );
}
