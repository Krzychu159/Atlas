import { backendGet, backendPost } from "../backend";

export type PaymentMethod = 1 | 2 | 3 | 4;
export type ClientPaymentStatus = 1 | 2 | 3 | 4;
export type ClientPaymentSource = 1 | 2 | 3;

export type ClientPayment = {
  id: number;
  clientId: number;
  clientName: string | null;
  clientPackageId: number | null;
  packageName: string | null;
  amount: number;
  currency: string | null;
  method: PaymentMethod;
  status: ClientPaymentStatus;
  source: ClientPaymentSource;
  paymentDate: string;
  createdAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
  createdByUserId: number | null;
  confirmedByUserId: number | null;
  rejectedByUserId: number | null;
  note: string | null;
  rejectionReason: string | null;
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

export type CreateClientPaymentPayload = {
  clientId?: number | null;
  clientPackageId?: number | null;
  amount: number;
  method: PaymentMethod;
  paymentDate?: string | null;
  note?: string | null;
};

export type CreateClientPackagePayload = {
  clientId: number;
  packageId: number;
  name?: string | null;
  totalSessions?: number | null;
  totalPrice?: number | null;
  expectedBillingType: number;
  purchaseDate: string;
  validUntil?: string | null;
  paymentDueDate?: string | null;
};

export function getPendingPayments() {
  return backendGet<ClientPayment[]>("billing/payments/pending");
}

export function getClientBilling(clientId: number) {
  return backendGet<ClientBillingSummary>(`billing/clients/${clientId}`);
}

export function createClientPayment(payload: CreateClientPaymentPayload) {
  return backendPost<ClientPayment>("billing/payments", payload);
}

export function confirmClientPayment(paymentId: number) {
  return backendPost<ClientPayment>(`billing/payments/${paymentId}/confirm`);
}

export function rejectClientPayment(paymentId: number, reason?: string) {
  return backendPost<ClientPayment>(`billing/payments/${paymentId}/reject`, {
    reason: reason || null,
  });
}

export function createClientPackage(payload: CreateClientPackagePayload) {
  return backendPost<void>("client-packages", payload);
}

export function activateClientPackage(clientId: number, clientPackageId: number) {
  return backendPost<void>(
    `client-packages/clients/${clientId}/packages/${clientPackageId}/activate`,
  );
}
