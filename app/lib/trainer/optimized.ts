import { backendGet } from "../backend";
import type { TrainerPortalClient } from "./portal";
import type { ClientBillingSummary, ClientPayment } from "../owner/billing";

export type PagedResult<T> = {
  page: number; pageSize: number; totalCount: number; totalPages: number; items: T[] | null;
};
export type RecentClientSession = {
  sessionId: number; title: string | null; startAt: string; endAt: string;
  status: string | null; trainerId: number; trainerName: string | null;
  locationId: number; locationName: string | null; attendanceStatus: string | null;
  isCountedFromPackage: boolean; clientPackageId: number | null;
  plannedSessionType: string | null; actualSessionType: string | null;
  plannedBillingType: string | null; actualBillingType: string | null;
};
export type ClientBillingTotals = Pick<ClientBillingSummary,
  "totalAmountDue" | "currentBalance" | "activePackageTotalPrice" | "activePackageAmountPaid" |
  "activePackageAmountDue" | "activeClientPackageId" | "activePackageName" | "activePackagePaymentStatus">;

export function getTrainerRecentSessions(id: number, signal?: AbortSignal) {
  return backendGet<PagedResult<RecentClientSession>>(`trainer-portal/clients/${id}/sessions/recent`, undefined, signal);
}
export function getTrainerBillingTotals(id: number, signal?: AbortSignal) {
  return backendGet<ClientBillingTotals>(`trainer-portal/clients/${id}/billing/summary`, undefined, signal);
}
export function getTrainerPendingPage(params: { Page: number; PageSize: number; Search?: string; ClientId?: number; LocationId?: number; Method?: number; Sort?: "paymentDateDesc" | "paymentDate" | "amountDesc" | "amount" }, signal?: AbortSignal) {
  return backendGet<PagedResult<ClientPayment>>("trainer-portal/payments/pending/page", params, signal);
}

export type TrainerClientsQuery = {
  Page: number; PageSize: number; Search?: string; LocationId?: number;
  HasActivePackage?: boolean;
  Sort?: "name" | "nameDesc" | "created" | "createdDesc" | "balance" | "balanceDesc" | "packageUsage" | "packageUsageDesc";
};
export function getTrainerClientsPage(query: TrainerClientsQuery, signal?: AbortSignal) {
  return backendGet<PagedResult<TrainerPortalClient>>("trainer-portal/clients/page", query, signal);
}
