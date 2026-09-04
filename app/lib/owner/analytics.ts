import { backendGet } from "../backend";

export type AnalyticsQuery = {
  from?: string | null;
  to?: string | null;
  locationId?: number | null;
  legalEntityId?: number | null;
  trainerId?: number | null;
  clientId?: number | null;
  clientPackageId?: number | null;
};

export type RevenueQuery = AnalyticsQuery & {
  method?: number | null;
  paymentProvider?: string | null;
  isRenewal?: boolean | null;
  hasProviderFee?: boolean | null;
  isProviderSettled?: boolean | null;
  payoutFrom?: string | null;
  payoutTo?: string | null;
};

export type TrainerCostsQuery = AnalyticsQuery & {
  isCoveredByContract?: boolean | null;
};

export type AnalyticsBreakdown = {
  id?: number | string | null;
  key?: number | string | null;
  name?: string | null;
  label?: string | null;
  month?: string | null;
  count?: number | null;
  amount?: number | null;
  grossAmount?: number | null;
  netAmount?: number | null;
  revenueAmount?: number | null;
  revenueGrossAmount?: number | null;
  revenueNetAmount?: number | null;
  providerFeeAmount?: number | null;
  trainerCostAmount?: number | null;
  potentialTrainerCostAmount?: number | null;
  profitAmount?: number | null;
  profitMarginPercent?: number | null;
  sessionsCount?: number | null;
  participantsCount?: number | null;
  billableHours?: number | null;
  trainerId?: number | null;
  trainerName?: string | null;
  locationId?: number | null;
  locationName?: string | null;
  legalEntityId?: number | null;
  legalEntityName?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  packageId?: number | null;
  packageName?: string | null;
  paymentMethod?: number | string | null;
  method?: number | string | null;
  paymentProvider?: string | null;
  [key: string]: unknown;
};

export type RevenueStatistics = {
  grossAmount: number;
  providerFeeAmount: number;
  netAmount: number;
  newPaymentGrossAmount: number;
  renewalPaymentGrossAmount: number;
  byLocation: AnalyticsBreakdown[] | null;
  byLegalEntity: AnalyticsBreakdown[] | null;
  byTrainer: AnalyticsBreakdown[] | null;
  byPackageType: AnalyticsBreakdown[] | null;
  byPackage: AnalyticsBreakdown[] | null;
  byClient: AnalyticsBreakdown[] | null;
  byPaymentMethod: AnalyticsBreakdown[] | null;
  byPaymentProvider: AnalyticsBreakdown[] | null;
  byPaymentLifecycle: AnalyticsBreakdown[] | null;
  byMonth: AnalyticsBreakdown[] | null;
};

export type TrainerCostStatistics = {
  sessionsCount: number;
  participantsCount: number;
  billableHours: number;
  revenueAmount: number;
  trainerCostAmount: number;
  potentialTrainerCostAmount: number;
  profitAmount: number;
  profitMarginPercent: number;
  byTrainer: AnalyticsBreakdown[] | null;
  byLocation: AnalyticsBreakdown[] | null;
  byLegalEntity: AnalyticsBreakdown[] | null;
  byClient: AnalyticsBreakdown[] | null;
  byPackage: AnalyticsBreakdown[] | null;
  byMonth: AnalyticsBreakdown[] | null;
};

export type TrainerCostSession = {
  id?: number;
  sessionId?: number;
  date?: string | null;
  startAt?: string | null;
  startsAt?: string | null;
  sessionDate?: string | null;
  trainerId?: number | null;
  trainerName?: string | null;
  locationId?: number | null;
  locationName?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  packageName?: string | null;
  participantsCount?: number | null;
  billableHours?: number | null;
  revenueAmount?: number | null;
  trainerCostAmount?: number | null;
  potentialTrainerCostAmount?: number | null;
  profitAmount?: number | null;
  profitMarginPercent?: number | null;
  isCoveredByContract?: boolean | null;
  [key: string]: unknown;
};

export type TrainerCostSessionsResult = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: TrainerCostSession[] | null;
};

export function getRevenueStatistics(query: RevenueQuery) {
  return backendGet<RevenueStatistics>("billing/revenue/statistics", query);
}

export function getTrainerCostStatistics(query: TrainerCostsQuery) {
  return backendGet<TrainerCostStatistics>(
    "billing/trainer-costs/statistics",
    query,
  );
}

export function getTrainerCostSessions(
  query: Pick<
    TrainerCostsQuery,
    "from" | "to" | "trainerId" | "locationId"
  > & { page?: number; pageSize?: number },
) {
  return backendGet<TrainerCostSessionsResult>(
    "billing/trainer-costs/sessions",
    query,
  );
}
