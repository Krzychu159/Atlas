export type PaymentBreakdownSource = {
  amount?: number | null;
  appliedToPackageAmount?: number | null;
  balanceCreditAmount?: number | null;
  clientPackageId?: number | null;
  packageName?: string | null;
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
  let balanceCreditAmount = toMoneyNumber(payment.balanceCreditAmount);

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

function toMoneyNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
