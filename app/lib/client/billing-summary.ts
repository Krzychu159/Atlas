import { isSessionPackage } from "@/app/lib/period-packages";
import type { ClientBillingSummary, ClientPackageBilling } from "./portal";

type BillingSource = ClientBillingSummary | null | undefined;

// null means the amount is unknown; it must never be displayed as zero.
export function getClientAmountDue(billing: BillingSource) {
  const amount = billing?.totalAmountDue;

  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

export function getClientBillingCurrency(billing: BillingSource) {
  const activePackage = billing?.packages?.find(
    (item) => item.clientPackageId === billing.activeClientPackageId,
  );

  return (
    activePackage?.currency ||
    billing?.packages?.[0]?.currency ||
    billing?.payments?.[0]?.currency ||
    null
  );
}

export function getUnpaidPackages(billing: BillingSource) {
  return (billing?.packages || [])
    .filter((item) => item.amountDue > 0 && !item.closedAt)
    .sort((first, second) => getDueTime(first) - getDueTime(second));
}

export function getNearestPaymentDueDate(billing: BillingSource) {
  return (
    getUnpaidPackages(billing).find((item) => item.paymentDueDate)
      ?.paymentDueDate || null
  );
}

// Online checkout is offered only where the portal already supported it.
export function canPayPackageOnline(item: ClientPackageBilling) {
  return isSessionPackage(item);
}

function getDueTime(item: ClientPackageBilling) {
  const time = item.paymentDueDate
    ? new Date(item.paymentDueDate).getTime()
    : Number.NaN;

  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}
