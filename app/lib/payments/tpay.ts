import { backendGet, backendPost } from "@/app/lib/backend";

export enum ClientPaymentStatus {
  PendingConfirmation = 1,
  Confirmed = 2,
  Rejected = 3,
  Cancelled = 4,
  Reversed = 5,
}

export type ClientPaymentDto = {
  id: number;
  clientId: number;
  clientPackageId: number | null;
  packageName: string | null;

  amount: number;
  currency: string | null;

  status: ClientPaymentStatus;

  paymentProvider: string | null;
  providerPaymentId: string | null;
  providerStatus: string | null;

  checkoutUrl: string | null;
  checkoutExpiresAt: string | null;

  confirmedAt: string | null;
  rejectedAt: string | null;
  reversedAt: string | null;
  webhookReceivedAt: string | null;

  rejectionReason: string | null;
};

export async function startTpayCheckout(
  clientPackageId: number,
): Promise<ClientPaymentDto> {
  return backendPost<ClientPaymentDto>(
    `payments/tpay/packages/${clientPackageId}/checkout`,
  );
}

export async function getTpayPayment(
  paymentId: number,
): Promise<ClientPaymentDto> {
  return backendGet<ClientPaymentDto>(`payments/tpay/payments/${paymentId}`);
}
