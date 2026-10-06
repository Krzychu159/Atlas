import { backendDelete, backendGet, backendPost } from "../backend";

export type PaymentMethod = 1 | 2 | 3 | 4;
export type ClientPaymentStatus = 1 | 2 | 3 | 4 | 5;
export type ClientPaymentSource = 1 | 2 | 3;

export const paymentMethodOptions = [
  { value: "1", label: "Blik" },
  { value: "2", label: "Przelew" },
  { value: "3", label: "Gotówka" },
  { value: "4", label: "Płatność online" },
];

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

export type PackagePaymentStatus = "Unpaid" | "Paid" | "Overdue" | "PartiallyPaid" | "PendingConfirmation";
export type PackageClosureDisposition = "Retained" | "RefundPending" | "Refunded" | "ClosedWithDebt" | "Closed" | "TransferredToBalance";
export type PackageOrigin = "Manual" | "GroupManual" | "GroupPublic" | "AutoRenewal" | "StaffPackageChange" | "OpeningBalance" | "SeedScenario";
export type PackageActivationMode = "Immediately" | "AfterCurrentPackage";

export type PackageClosureFields = {
  isActive: boolean;
  closureDisposition: PackageClosureDisposition | null;
  closureReason: string | null;
  closedAt: string | null;
  refundAmount: number;
  refundConfirmedAt: string | null;
  refundReference: string | null;
};

export type ClientPackageBilling = PackageClosureFields & {
  origin: PackageOrigin | null;
  clientPackageId: number;
  packageId: number;
  packageName: string | null;
  activationMode: PackageActivationMode | null;
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
  expectedBillingType: string | number | null;
  packageType?: string | null;
  participantsCount?: number | null;
  locationId: number | null;
  locationName: string | null;
  paymentStatus: PackagePaymentStatus | null;
  purchaseDate: string;
  validUntil: string | null;
  paymentDueDate: string | null;
  activatedAt: string | null;
};

export type ClientBillingSummary = {
  totalAmountDue: number;
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

export type PagedResult<T> = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: T[] | null;
};

export type PaymentsQuery = {
  clientId?: number | null;
  status?: ClientPaymentStatus | null;
  source?: ClientPaymentSource | null;
  from?: string | null;
  to?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
  hasOverpayment?: boolean | null;
  page?: number | null;
  pageSize?: number | null;
};

export type ClientBalanceTransaction = {
  id: number;
  clientId: number;
  clientPackageId: number | null;
  sessionId: number | null;
  amount: number;
  type: string | null;
  description: string | null;
  createdAt: string;
};

export function getPendingPayments() {
  return backendGet<ClientPayment[]>("billing/payments/pending");
}

export function getOwnerPayments(query?: PaymentsQuery) {
  return backendGet<PagedResult<ClientPayment>>(
    "billing/payments",
    toPaymentsQuery(query),
  );
}

export function getClientPayments(clientId: number, query?: PaymentsQuery) {
  return backendGet<PagedResult<ClientPayment>>(
    `billing/clients/${clientId}/payments`,
    toPaymentsQuery(query),
  );
}

export function getClientBalanceTransactions(
  clientId: number,
  query?: Pick<PaymentsQuery, "page" | "pageSize">,
) {
  return backendGet<PagedResult<ClientBalanceTransaction>>(
    `clients/${clientId}/balance-transactions`,
    {
      Page: query?.page,
      PageSize: query?.pageSize,
    },
  );
}

export function getClientActivePackage(clientId: number) {
  return backendGet<ClientPackageBilling>(
    `billing/clients/${clientId}/active-package`,
  );
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

export function issuePaymentReceipt(paymentId: number, receiptNumber?: string) {
  return backendPost<ClientPayment>(
    `billing/payments/${paymentId}/receipt/issue`,
    {
      receiptNumber: receiptNumber || null,
    },
  );
}

export function cancelPaymentReceipt(paymentId: number) {
  return backendPost<ClientPayment>(
    `billing/payments/${paymentId}/receipt/cancel`,
  );
}

export function reverseClientPayment(paymentId: number, reason?: string) {
  return backendPost<ClientPayment>(`billing/payments/${paymentId}/reverse`, {
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

export function deleteClientPackage(clientId: number, clientPackageId: number) {
  return backendDelete<void>(
    `client-packages/clients/${clientId}/packages/${clientPackageId}`,
  );
}

export type PackageManagementPreview = {
  // Opaque token: preserve the value returned by the server without coercion.
  version: unknown;
  amountDue: number;
  remainingSessions: number;
  canDelete: boolean;
  canEdit: boolean;
  canCorrect: boolean;
  canClose: boolean;
  deleteBlockReason: unknown;
  blockers: unknown[];
};

export type CorrectClientPackagePayload = {
  expectedVersion: unknown;
  reason: string;
  totalSessions?: number;
  totalPrice?: number;
  validUntil?: string;
  paymentDueDate?: string;
};

export type CloseClientPackagePayload = {
  expectedVersion: unknown;
  reason: string;
  debtDisposition: "KeepDue" | "WaiveDue";
  fundsDisposition: "KeepFunds" | "Balance" | "Refund";
  settlementAmount: number;
  replacement?: { clientId: number; packageId: number; purchaseDate: string };
};

export function closeClientPackage(clientId: number, clientPackageId: number, payload: CloseClientPackagePayload) {
  return backendPost<{ replacementClientPackageId: number | null }>(
    `client-packages/clients/${clientId}/packages/${clientPackageId}/close`, payload,
  );
}

export type ImportClientPackagePayload = {
  requestId: string;
  reason: string;
  usedSessions: number;
  amountPaid: number;
  package: {
    clientId: number;
    packageId: number;
    totalSessions: number;
    totalPrice: number;
    purchaseDate: string;
    validUntil: string;
  };
};

export function importClientPackage(payload: ImportClientPackagePayload) {
  return backendPost<{ id: number }>("client-packages/import", payload);
}

export function getPackageClosureLabel(value: unknown): string | null {
  const labels: Record<string, string> = {
    Retained: "Zachowany do wznowienia",
    RefundPending: "Zwrot oczekuje na potwierdzenie",
    Refunded: "Zwrot potwierdzony",
    ClosedWithDebt: "Zamknięty z pozostawioną należnością",
    Closed: "Zamknięty",
    TransferredToBalance: "Środki przeniesione na saldo",
  };
  return typeof value === "string" ? Object.hasOwn(labels, value) ? labels[value] : "Rozliczenie pakietu niedostępne" : null;
}

export function getPackageOriginLabel(value: unknown): string | null {
  const labels: Record<string, string> = {
    Manual: "Utworzony ręcznie",
    GroupManual: "Pakiet grupowy — przypisany przez studio",
    GroupPublic: "Pakiet grupowy — zakup publiczny",
    AutoRenewal: "Automatyczne odnowienie",
    StaffPackageChange: "Zmiana pakietu przez studio",
    OpeningBalance: "Stan początkowy",
  };
  return typeof value === "string" && Object.hasOwn(labels, value) ? labels[value] : null;
}

export function getPackagePaymentStatusLabel(value: unknown): string {
  const labels: Record<string, string> = {
    Unpaid: "Nieopłacony", Paid: "Opłacony", Overdue: "Po terminie płatności",
    PartiallyPaid: "Częściowo opłacony", PendingConfirmation: "Oczekuje na potwierdzenie wpłaty",
  };
  return typeof value === "string" && Object.hasOwn(labels, value) ? labels[value] : "Stan płatności niedostępny";
}

export function getClientPackageManagementPreview(clientId: number, clientPackageId: number) {
  return backendGet<PackageManagementPreview>(
    `client-packages/clients/${clientId}/packages/${clientPackageId}/management-preview`,
  );
}

export function correctClientPackage(clientId: number, clientPackageId: number, payload: CorrectClientPackagePayload) {
  return backendPost<void>(
    `client-packages/clients/${clientId}/packages/${clientPackageId}/correct`, payload,
  );
}

const packageBlockerLabels: Record<string, string> = {
  PackageClosed: "Pakiet został zamknięty. Historia pozostaje dostępna.",
  PaymentHistory: "Pakiet ma historię wpłat. Użyj zamknięcia zamiast usuwania.",
  BalanceHistory: "Pakiet ma operacje na saldzie. Nie można go usunąć.",
  UsedSessions: "Z pakietu odliczono treningi. Nie można go usunąć.",
  OpeningBalance: "Pakiet został zaimportowany. Zachowujemy jego historię.",
  PendingPayment: "Najpierw rozstrzygnij oczekującą wpłatę lub płatność online.",
  UnfinishedSessions: "Najpierw rozlicz niezakończone treningi powiązane z pakietem.",
  HasRenewal: "Pakiet ma kolejny cykl. Najpierw rozlicz powiązany pakiet.",
};

export function getPackageBlockerLabel(value: unknown) {
  return typeof value === "string" && Object.hasOwn(packageBlockerLabels, value)
    ? packageBlockerLabels[value]
    : "Ta czynność jest obecnie niedostępna. Odśwież dane pakietu lub skontaktuj się z obsługą studia.";
}

export function isPendingPayment(payment: ClientPayment) {
  return payment.status === 1 && !payment.confirmedAt && !payment.rejectedAt;
}

export function isConfirmedPayment(payment: ClientPayment) {
  return !isReversedPayment(payment) && (payment.status === 2 || Boolean(payment.confirmedAt));
}

export function isRejectedPayment(payment: ClientPayment) {
  return payment.status === 3 || Boolean(payment.rejectedAt);
}

export function isReversedPayment(payment: ClientPayment) {
  return payment.status === 5 || Boolean(payment.reversedAt);
}

export function isReceiptIssued(payment: ClientPayment) {
  const normalized = payment.receiptStatus?.toLowerCase() || "";

  if (
    normalized.includes("cancel") ||
    normalized.includes("anul") ||
    normalized.includes("void")
  ) {
    return false;
  }

  return Boolean(
    payment.receiptIssuedAt ||
      payment.receiptNumber ||
      normalized.includes("issued") ||
      normalized.includes("printed") ||
      normalized.includes("wystaw"),
  );
}

export function getPaymentMethodLabel(method?: number | null) {
  const labels: Record<number, string> = {
    1: "Blik",
    2: "Przelew",
    3: "Gotówka",
    4: "Płatność online",
  };

  return method ? labels[method] || "Inna metoda płatności" : "Brak metody";
}

export function getPaymentStatusLabel(status?: number | null) {
  const labels: Record<number, string> = {
    1: "Oczekuje",
    2: "Opłacone",
    3: "Odrzucone",
    4: "Anulowane",
    5: "Cofnięte",
  };

  return status ? labels[status] || "Status płatności niedostępny" : "Brak statusu";
}

export function getPaymentSourceLabel(source?: number | null) {
  const labels: Record<number, string> = {
    1: "Obsługa",
    2: "Klient",
    3: "System",
  };

  return source ? labels[source] || "Źródło płatności niedostępne" : "Brak źródła";
}

function toPaymentsQuery(query?: PaymentsQuery) {
  return {
    ClientId: query?.clientId,
    Status: query?.status,
    Source: query?.source,
    From: query?.from,
    To: query?.to,
    AmountMin: query?.amountMin,
    AmountMax: query?.amountMax,
    HasOverpayment: query?.hasOverpayment,
    Page: query?.page,
    PageSize: query?.pageSize,
  };
}
