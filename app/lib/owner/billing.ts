import { backendGet, backendPost } from "../backend";

export type PaymentMethod = 1 | 2 | 3 | 4;
export type ClientPaymentStatus = 1 | 2 | 3 | 4;
export type ClientPaymentSource = 1 | 2 | 3;

export const paymentMethodOptions = [
  { value: "1", label: "Blik" },
  { value: "2", label: "Przelew" },
  { value: "3", label: "Gotówka" },
  { value: "4", label: "Bramka płatności" },
];

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

export function isPendingPayment(payment: ClientPayment) {
  return payment.status === 1 && !payment.confirmedAt && !payment.rejectedAt;
}

export function isConfirmedPayment(payment: ClientPayment) {
  return payment.status === 2 || Boolean(payment.confirmedAt);
}

export function isRejectedPayment(payment: ClientPayment) {
  return payment.status === 3 || Boolean(payment.rejectedAt);
}

export function getPaymentMethodLabel(method?: number | null) {
  const labels: Record<number, string> = {
    1: "Blik",
    2: "Przelew",
    3: "Gotówka",
    4: "Bramka płatności",
  };

  return method ? labels[method] || `Metoda ${method}` : "Brak metody";
}

export function getPaymentStatusLabel(status?: number | null) {
  const labels: Record<number, string> = {
    1: "Oczekuje",
    2: "Opłacone",
    3: "Odrzucone",
    4: "Anulowane",
  };

  return status ? labels[status] || `Status ${status}` : "Brak statusu";
}
