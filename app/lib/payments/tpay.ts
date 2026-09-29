import {
  backendGet,
  backendPost,
  getErrorMessage,
} from "@/app/lib/backend";

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

const knownTpayErrors: Record<string, string> = {
  "current terms for this location must be accepted before continuing":
    "Przed rozpoczęciem płatności zaakceptuj aktualny regulamin studia.",
  "online payments are not configured for this location":
    "Płatności online nie są skonfigurowane dla tej lokalizacji.",
  "tpay is not configured for this location":
    "Płatności Tpay nie są skonfigurowane dla tej lokalizacji.",
  "client package was not found": "Nie znaleziono wybranego pakietu klienta.",
  "payment was not found": "Nie znaleziono płatności.",
  "there is no amount due for this package":
    "Ten pakiet nie ma kwoty pozostałej do zapłaty.",
  "a pending payment already exists for this package":
    "Dla tego pakietu istnieje już płatność oczekująca na potwierdzenie.",
};

export function getTpayErrorMessage(
  error: unknown,
  fallback = "Nie udało się wykonać operacji płatniczej.",
) {
  const message =
    typeof error === "string" && error.trim()
      ? error
      : getErrorMessage(error, fallback);
  const normalized = message.trim().replace(/[.!]+$/, "").toLowerCase();

  return knownTpayErrors[normalized] || message;
}
