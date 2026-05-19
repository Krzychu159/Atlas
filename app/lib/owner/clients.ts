import { backendGet, backendPatch, backendPost, backendPut } from "../backend";

export type ClientStatus = "active" | "suspended" | "new" | string;

export type Client = {
  id: number;
  trainerId: number | null;
  activePackageId: number | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  goal: string;
  notes: string;
  progressPercent: number;
  billingStatus: string;
  status: ClientStatus;
  subscriptionStatus?: string | null;
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
  nextSessionAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  trainerFullName: string;
  locationId: number;
  locationName: string;
};

export type SubscriptionCycle = {
  clientPackageId: number;
  packageId: number;
  packageName: string | null;
  isActive: boolean;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  originalPrice: number;
  balanceApplied: number;
  amountToPay: number;
  amountPaid: number;
  amountDue: number;
  currency: string | null;
  expectedBillingType: string | null;
  paymentStatus: string | null;
  purchaseDate: string;
  validUntil: string | null;
  activatedAt: string | null;
};

export type SubscriptionNextPackage = {
  packageId: number;
  packageName: string | null;
  sessionsLimit: number;
  sessionsPerWeek: number;
  price: number;
  currency: string | null;
  billingType: string | null;
};

export type ClientSubscription = {
  clientId: number;
  clientName: string | null;
  status: string | null;
  autoRenewEnabled: boolean;
  cancelRenewalRequested: boolean;
  renewalCancellationRequestedAt: string | null;
  currentCycle: SubscriptionCycle | null;
  nextPackage: SubscriptionNextPackage | null;
  carryOverBalance: number;
};

export type SubscriptionUsageSession = {
  sessionId: number;
  date: string;
  trainerName: string | null;
  status: string | null;
  plannedBillingType: string | null;
  actualBillingType: string | null;
  expectedUnitPrice: number;
  actualUnitPrice: number;
  balanceDifference: number;
};

export type SubscriptionUsage = {
  clientId: number;
  clientPackageId: number | null;
  expectedBillingType: string | null;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  adjustmentsTotal: number;
  differentThanExpectedCount: number;
  sessions: SubscriptionUsageSession[] | null;
};

export type ClientTrainingPlan = {
  clientId: number;
  googleDriveFolderId: string | null;
  googleDriveFolderUrl: string | null;
  fileId: string | null;
  fileName: string | null;
  url: string | null;
};

export type UpdateClientTrainingPlanPayload = {
  googleDriveFolderId: string;
  fileId: string;
  fileName: string;
  url: string;
};

export type CreateClientPayload = {
  trainerId: number;
  activePackageId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  goal: string;
  notes: string;
  progressPercent: number;
  billingStatus: string;
  status: string;
  nextSessionAt: string | null;
  createdBy: number;
  locationId: number;
};

export type UpdateClientPayload = {
  trainerId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  goal?: string | null;
  notes?: string | null;
  progressPercent?: number;
  billingStatus?: string | null;
  status?: string | null;
  nextSessionAt?: string | null;
  locationId?: number;
};

export function getClients() {
  return backendGet<Client[]>("Clients");
}

export function getClient(id: number) {
  return backendGet<Client>(`Clients/${id}`);
}

export function getClientsByTrainer(trainerId: number) {
  return backendGet<Client[]>("Clients/filter", { TrainerId: trainerId });
}

export function getClientSubscription(id: number) {
  return backendGet<ClientSubscription>(`Clients/${id}/subscription`);
}

export function setClientNextPackage(id: number, packageId: number) {
  return backendPut<ClientSubscription>(`Clients/${id}/subscription/next-package`, {
    packageId,
  });
}

export function cancelClientSubscription(id: number) {
  return backendPost<ClientSubscription>(`Clients/${id}/subscription/cancel`);
}

export function resumeClientSubscription(id: number) {
  return backendPost<ClientSubscription>(`Clients/${id}/subscription/resume`);
}

export function getClientSubscriptionUsage(id: number) {
  return backendGet<SubscriptionUsage>(
    `Clients/${id}/subscription/current-cycle/usage`,
  );
}

export function getClientCurrentCycle(id: number) {
  return backendGet<SubscriptionCycle>(
    `clients/${id}/subscription/current-cycle`,
  );
}

export function getClientTrainingPlan(id: number) {
  return backendGet<ClientTrainingPlan>(`clients/${id}/training-plan`);
}

export function createClient(payload: CreateClientPayload) {
  return backendPost<Client>("Clients", payload);
}

export function updateClient(id: number, payload: UpdateClientPayload) {
  return backendPatch<Client>(`Clients/${id}`, payload);
}

export function updateClientTrainingPlan(
  id: number,
  payload: UpdateClientTrainingPlanPayload,
) {
  return backendPut<ClientTrainingPlan>(`clients/${id}/training-plan`, payload);
}
