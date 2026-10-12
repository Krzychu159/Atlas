import { ApiError, backendGet, getErrorMessage } from "../backend";
import type { ClientPayment, PagedResult } from "../owner/billing";
import type { PaymentDisplaySource } from "@/app/components/payments/PaymentDisplay";

export function canCorrectPaymentDate(payment: PaymentDisplaySource) {
  return (payment.status === 1 || payment.status === 2) &&
    (payment.source === 1 || payment.source === 2) &&
    (payment.method === 1 || payment.method === 2 || payment.method === 3) &&
    payment.externalPaymentId === null && payment.paymentProvider === null &&
    payment.providerPaymentId === null && payment.checkoutUrl === null &&
    payment.rejectedAt === null && payment.reversedAt === null &&
    typeof payment.paymentDate === "string" && /(?:Z|[+-]\d{2}:\d{2})$/i.test(payment.paymentDate) &&
    Number.isFinite(Date.parse(payment.paymentDate));
}

export async function refreshPaymentForDateCorrection(portal: "owner" | "trainer", clientId: number, paymentId: number) {
  const path = portal === "owner" ? `billing/clients/${clientId}/payments` : `trainer-portal/clients/${clientId}/payments`;
  for (let page = 1; ; page += 1) {
    const result = await backendGet<PagedResult<ClientPayment>>(path, { Page: page, PageSize: 100 });
    const payment = result.items?.find(item => item.id === paymentId && item.clientId === clientId);
    if (payment) return payment;
    if (!Number.isSafeInteger(result.totalPages) || page >= result.totalPages) break;
  }
  throw new Error("Nie znaleziono wpłaty lub nie masz do niej dostępu.");
}

export function paymentDateInput(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number, length = 2) => String(part).padStart(length, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function paymentDateWithOffset(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  const second = Number(match[6] || 0), millisecond = Number((match[7] || "0").padEnd(3, "0"));
  const date = new Date(year, month - 1, day, hour, minute, second, millisecond);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second) return null;
  const offset = -date.getTimezoneOffset();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${paymentDateInput(date.toISOString())}${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

export function paymentDateError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz uprawnień do zmiany daty tej wpłaty.";
    if (error.status === 404) return "Nie znaleziono wpłaty lub nie masz do niej dostępu.";
    if (error.status === 400) return getErrorMessage(error, "Nie można zmienić daty tej wpłaty. Sprawdź datę, powód i aktualny stan wpłaty.");
  }
  return getErrorMessage(error, "Nie udało się zapisać korekty daty wpłaty.");
}
