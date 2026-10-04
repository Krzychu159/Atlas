import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
  backendPut,
} from "../backend";

export type ClientStatus = "active" | "suspended" | "new" | string;
export type PortalAccessStatus =
  | "NoAccount"
  | "Invited"
  | "Active"
  | "Blocked";

export type Client = {
  id: number;
  userId: number | null;
  trainerId: number | null;
  activePackageId: number | null;
  activeClientPackageId?: number | null;
  activeClientPackageName?: string | null;
  activePackageTotalSessions?: number | null;
  activePackageUsedSessions?: number | null;
  activePackageRemainingSessions?: number | null;
  activePackagePaymentStatus?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
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
  trainingStartDate?: string | null;
  nextSessionAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  trainerFullName: string;
  locationId: number;
  locationName: string;
  portalAccessStatus: PortalAccessStatus;
  isArchived: boolean;
  archivedAt: string | null;
  emailContactUrl: string;
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

export type ClientLegalConsent = {
  legalEntityName: string;
  documentType: string;
  documentVersion: string;
  documentUrl: string | null;
  source: string;
  acceptedAt: string;
  isCurrent: boolean;
};

export type UpdateClientTrainingPlanPayload = {
  googleDriveFolderId: string;
  fileId: string;
  fileName: string;
  url: string;
};

export type CreateClientPayload = {
  firstName: string;
  lastName: string;
  locationId: number;
  trainerId?: number | null;
  email?: string | null;
  phoneNumber?: string | null;
};

export type ClientArchiveCheck = {
  clientId: number;
  canArchive: boolean;
  blockers: string[];
};

export type ClientClosurePackage = {
  clientPackageId: number;
  name: string;
  requiresDecision: boolean;
  remainingSessions: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  disposition: string | null;
  refundAmount: number;
  refundConfirmedAt: string | null;
};

export type ClientClosurePreview = {
  clientId: number;
  blockers: string[];
  futureSessionIds: number[];
  balance: number;
  packages: ClientClosurePackage[];
};

export type CloseCooperationPayload = {
  reason: string;
  packages: Array<{
    clientPackageId: number;
    disposition: "Retain" | "Refund";
    refundAmount: number;
  }>;
};

export type ClientRefund = {
  clientPackageId: number;
  packageName: string | null;
  amount: number;
  currency: string | null;
  disposition: string | null;
  confirmedAt: string | null;
  reference: string | null;
};

export type ClientRefundsPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: ClientRefund[] | null;
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
  trainingStartDate?: string | null;
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

export function getClientLegalConsents(id: number) {
  return backendGet<ClientLegalConsent[]>(`clients/${id}/legal-consents`);
}

export function createClient(payload: CreateClientPayload) {
  return backendPost<Client>("clients", payload);
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

export function setClientPortalAccess(clientId: number, blocked: boolean) {
  return backendPut<void>(`clients/${clientId}/portal-access`, { blocked });
}

export function getArchivedClients() {
  return backendGet<Client[]>("clients/archived");
}

export function getClientArchiveCheck(id: number) {
  return backendGet<ClientArchiveCheck>(`clients/${id}/archive-check`);
}

export function getClientClosurePreview(id: number) {
  return backendGet<ClientClosurePreview>(`clients/${id}/closure-preview`);
}

export function closeClientCooperation(
  id: number,
  payload: CloseCooperationPayload,
) {
  return backendPost<ClientClosurePreview>(
    `clients/${id}/close-cooperation`,
    payload,
  );
}

export function getClientRefunds(
  id: number,
  query: { page?: number; pageSize?: number } = {},
) {
  return backendGet<ClientRefundsPage>("clients/refunds", {
    ClientId: id,
    Page: query.page,
    PageSize: query.pageSize,
  });
}

export function confirmClientRefund(
  clientId: number,
  clientPackageId: number,
  payload: { amount: number; reference: string },
) {
  return backendPost<void>(
    `clients/${clientId}/packages/${clientPackageId}/confirm-refund`,
    payload,
  );
}

export function archiveClient(id: number) {
  return backendPost<void>(`clients/${id}/archive`);
}

export function restoreClient(id: number) {
  return backendPost<void>(`clients/${id}/restore`);
}

export function permanentlyDeleteClient(id: number) {
  return backendDelete<void>(`clients/${id}/permanent`);
}
