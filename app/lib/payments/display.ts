export type PaymentBreakdownSource = {
  amount?: number | null;
  appliedToPackageAmount?: number | null;
  balanceCreditAmount?: number | null;
  currency?: string | null;
  clientPackageId?: number | null;
  packageName?: string | null;
  status?: number | string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  reversedAt?: string | null;
  method?: number | null;
  source?: number | null;
  receiptStatus?: string | null;
  receiptNumber?: string | null;
  receiptIssuedAt?: string | null;
};

export type PaymentBreakdown = {
  amount: number;
  appliedToPackageAmount: number;
  balanceCreditAmount: number;
};

export function getPaymentBreakdown(
  payment: PaymentBreakdownSource,
): PaymentBreakdown {
  const amount = toMoneyNumber(payment.amount);
  let appliedToPackageAmount = toMoneyNumber(payment.appliedToPackageAmount);
  const balanceCreditAmount = toMoneyNumber(payment.balanceCreditAmount);

  if (
    amount > 0 &&
    appliedToPackageAmount === 0 &&
    balanceCreditAmount === 0 &&
    (payment.clientPackageId || payment.packageName)
  ) {
    appliedToPackageAmount = amount;
  }

  return {
    amount,
    appliedToPackageAmount,
    balanceCreditAmount,
  };
}

export function hasPaymentOverpayment(payment: PaymentBreakdownSource) {
  return getPaymentBreakdown(payment).balanceCreditAmount > 0;
}

export function hasPaymentBalanceMovement(payment: PaymentBreakdownSource) {
  return getPaymentBreakdown(payment).balanceCreditAmount !== 0;
}

export function isPaymentPending(payment: PaymentBreakdownSource) {
  return (
    payment.status === 1 &&
    !payment.confirmedAt &&
    !payment.rejectedAt &&
    !payment.reversedAt
  );
}

export function isPaymentConfirmed(payment: PaymentBreakdownSource) {
  return payment.status === 2 || Boolean(payment.confirmedAt);
}

export function isPaymentRejected(payment: PaymentBreakdownSource) {
  return payment.status === 3 || Boolean(payment.rejectedAt);
}

export function isPaymentReversed(payment: PaymentBreakdownSource) {
  return payment.status === 5 || Boolean(payment.reversedAt);
}

export function isPaymentReceiptIssued(payment: PaymentBreakdownSource) {
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

export function getPaymentStatusLabel(status?: number | string | null) {
  if (typeof status === "string") {
    const normalized = status.toLowerCase();

    if (normalized.includes("paid") || normalized.includes("confirm")) {
      return "Opłacone";
    }

    if (normalized.includes("pending")) return "Oczekuje";
    if (normalized.includes("reject")) return "Odrzucone";
    if (normalized.includes("reverse")) return "Cofnięte";
    if (normalized.includes("cancel")) return "Anulowane";

    return status || "Brak statusu";
  }

  const labels: Record<number, string> = {
    1: "Oczekuje",
    2: "Opłacone",
    3: "Odrzucone",
    4: "Anulowane",
    5: "Cofnięte",
  };

  return status ? labels[status] || `Status ${status}` : "Brak statusu";
}

export function getPaymentStatusTone(payment: PaymentBreakdownSource) {
  if (isPaymentPending(payment)) return "warning";
  if (isPaymentRejected(payment) || isPaymentReversed(payment)) return "danger";
  if (isPaymentConfirmed(payment)) return "success";

  return "neutral";
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

export function getPaymentSourceLabel(source?: number | null) {
  const labels: Record<number, string> = {
    1: "Obsługa",
    2: "Klient",
    3: "System",
  };

  return source ? labels[source] || `Źródło ${source}` : "Brak źródła";
}

function toMoneyNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
