import { getPendingPayments } from "@/app/lib/owner/billing";
import { getTrainerPortalPendingPayments } from "@/app/lib/trainer/portal";
import {
  getNotificationPaymentId,
  isGeneralPaymentsDestination,
  type AppNotification,
  type NotificationRole,
} from "@/app/lib/notifications";

const RESOLVE_TIMEOUT_MS = 1500;

/**
 * When a payment notification names only the payment, find its client among payments awaiting
 * confirmation (role-specific endpoints) and open that client's payments tab. Falls back to the
 * given destination if the payment is not found, the request fails or takes too long.
 */
export async function resolvePaymentNotificationTarget(
  notification: AppNotification,
  role: NotificationRole | null,
  destination: string | null,
) {
  if (!role || role === "client" || !isGeneralPaymentsDestination(destination, role)) return destination;
  const paymentId = getNotificationPaymentId(notification);
  if (!paymentId) return destination;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    const pending = await Promise.race([
      role === "owner" ? getPendingPayments() : getTrainerPortalPendingPayments(controller.signal),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("timeout")), { once: true })),
    ]);
    const clientId = Array.isArray(pending) ? pending.find(payment => payment.id === paymentId)?.clientId : undefined;
    return typeof clientId === "number" && Number.isSafeInteger(clientId) && clientId > 0
      ? `/${role}/clients/${clientId}/payments`
      : destination;
  } catch {
    return destination;
  } finally {
    clearTimeout(timer);
  }
}
