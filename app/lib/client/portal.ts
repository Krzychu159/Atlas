import { backendDelete, backendGet, backendPatch, backendPost } from "../backend";

export type PaymentMethod = 1 | 2 | 3 | 4;
export type ClientPaymentStatus = 1 | 2 | 3 | 4 | 5;
export type ClientPaymentSource = 1 | 2 | 3;

export type ClientPortalMe = {
  clientId: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  goal: string | null;
  status: string | null;
  billingStatus: string | null;
  locationName: string | null;
  trainerFullName: string | null;
};

export type ClientPortalTrainer = {
  trainerId: number | null;
  fullName: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  emailContactUrl: string | null;
  avatarUrl: string | null;
  specialization: string | null;
};

export type ClientPortalPackage = {
  packageId: number | null;
  name: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  sessionsLimit: number | null;
  usedSessionsCount: number;
  remainingSessionsCount: number;
  progressPercent: number;
  durationDays: number | null;
};

export type ClientPortalPaymentSummary = {
  amountDue: number;
  currency: string | null;
  billingStatus: string | null;
  paymentDueDate: string | null;
};

export type ClientPortalSession = {
  id: number;
  title: string | null;
  note: string | null;
  startAt: string;
  endAt: string;
  locationName: string | null;
  trainerFullName: string | null;
  status: string | null;
};

export type ClientPortalDashboard = {
  greetingName: string | null;
  greetingMessage: string | null;
  me: ClientPortalMe | null;
  nextSession: ClientPortalSession | null;
  trainer: ClientPortalTrainer | null;
  package: ClientPortalPackage | null;
  payment: ClientPortalPaymentSummary | null;
  upcomingSessions: ClientPortalSession[] | null;
  recentSessions: ClientPortalSession[] | null;
};

export type ClientPayment = {
  id: number;
  clientId: number;
  clientName: string | null;
  clientPackageId: number | null;
  packageName: string | null;
  amount: number;
  appliedToPackageAmount: number;
  balanceCreditAmount: number;
  currency: string | null;
  method: PaymentMethod;
  status: ClientPaymentStatus;
  source: ClientPaymentSource;
  paymentDate: string;
  createdAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
  reversedAt: string | null;
  createdByUserId: number | null;
  confirmedByUserId: number | null;
  rejectedByUserId: number | null;
  reversedByUserId: number | null;
  note: string | null;
  rejectionReason: string | null;
  reversalReason: string | null;
  receiptStatus: string | null;
  receiptNumber: string | null;
  receiptIssuedAt: string | null;
};

export type ClientPackageBilling = {
  clientPackageId: number;
  packageId: number;
  packageName: string | null;
  isActive: boolean;
  activationMode: string | null;
  totalSessions: number;
  sessionsPerWeek: number;
  usedSessions: number;
  remainingSessions: number;
  totalPrice: number;
  originalPrice: number;
  balanceApplied: number;
  expectedUnitPrice: number;
  amountPaid: number;
  amountDue: number;
  currency: string | null;
  expectedBillingType: string | null;
  locationId: number | null;
  locationName: string | null;
  paymentStatus: string | null;
  purchaseDate: string;
  validUntil: string | null;
  paymentDueDate: string | null;
  activatedAt: string | null;
};

export type ClientBillingSummary = {
  clientId: number;
  clientName: string | null;
  currentBalance: number;
  activePackageTotalPrice: number;
  activePackageAmountPaid: number;
  activePackageAmountDue: number;
  activeClientPackageId: number | null;
  activePackageName: string | null;
  activePackagePaymentStatus: string | null;
  packages: ClientPackageBilling[] | null;
  payments: ClientPayment[] | null;
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

export type UpdateClientPortalProfilePayload = {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
};

export type CreateClientPortalPaymentPayload = {
  clientId?: number | null;
  clientPackageId?: number | null;
  amount: number;
  method: PaymentMethod;
  paymentDate?: string | null;
  note?: string | null;
};

export type RequestClientEmailChangePayload = {
  requestedEmail?: string | null;
};

export function getClientPortalDashboard() {
  return backendGet<ClientPortalDashboard>("client-portal/dashboard");
}

export function getClientPortalMe() {
  return backendGet<ClientPortalMe>("client-portal/me");
}

export function updateClientPortalMe(payload: UpdateClientPortalProfilePayload) {
  return backendPatch<ClientPortalMe>("client-portal/me", payload);
}

export function requestClientPortalEmailChange(
  payload: RequestClientEmailChangePayload,
) {
  return backendPost<void>("client-portal/email-change-requests", payload);
}

export function getClientPortalBilling() {
  return backendGet<ClientBillingSummary>("client-portal/billing");
}

export function createClientPortalPayment(
  payload: CreateClientPortalPaymentPayload,
) {
  return backendPost<ClientPayment>("client-portal/payments", payload);
}

export function getClientPortalSchedule() {
  return backendGet<ClientPortalSession[]>("client-portal/schedule");
}

export function getClientPortalSubscription() {
  return backendGet<ClientSubscription>("client-portal/subscription");
}

export function requestClientSubscriptionCancel() {
  return backendPost<ClientSubscription>(
    "client-portal/subscription/cancel-request",
  );
}

export function withdrawClientSubscriptionCancel() {
  return backendDelete<ClientSubscription>(
    "client-portal/subscription/cancel-request",
  );
}

export function getClientPortalSubscriptionUsage() {
  return backendGet<SubscriptionUsage>(
    "client-portal/subscription/current-cycle/usage",
  );
}

export function getClientPortalTrainingPlan() {
  return backendGet<ClientTrainingPlan>("client-portal/training-plan");
}
