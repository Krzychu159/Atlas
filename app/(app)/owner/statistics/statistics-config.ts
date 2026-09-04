import type { ExpenseStatistics } from "@/app/lib/owner/expenses";
import type {
  AnalyticsBreakdown,
  RevenueStatistics,
  TrainerCostSession,
  TrainerCostStatistics,
} from "@/app/lib/owner/analytics";

export const emptyRevenueStatistics: RevenueStatistics = {
  grossAmount: 0,
  providerFeeAmount: 0,
  netAmount: 0,
  newPaymentGrossAmount: 0,
  renewalPaymentGrossAmount: 0,
  byLocation: [],
  byLegalEntity: [],
  byTrainer: [],
  byPackageType: [],
  byPackage: [],
  byClient: [],
  byPaymentMethod: [],
  byPaymentProvider: [],
  byPaymentLifecycle: [],
  byMonth: [],
};

export const emptyExpenseStatistics: ExpenseStatistics = {
  expenseCount: 0,
  paidCount: 0,
  unpaidCount: 0,
  overdueCount: 0,
  netAmount: 0,
  vatAmount: 0,
  grossAmount: 0,
  paidGrossAmount: 0,
  unpaidGrossAmount: 0,
  overdueGrossAmount: 0,
  revenueGrossAmount: 0,
  paymentProviderFeeAmount: 0,
  revenueNetAmount: 0,
  operatingProfitGrossAmount: 0,
  operatingProfitNetAmount: 0,
  byLegalEntity: [],
  byLocation: [],
  byCategory: [],
  byPaymentStatus: [],
  byMonth: [],
};

export const emptyTrainerCostStatistics: TrainerCostStatistics = {
  sessionsCount: 0,
  participantsCount: 0,
  billableHours: 0,
  revenueAmount: 0,
  trainerCostAmount: 0,
  potentialTrainerCostAmount: 0,
  profitAmount: 0,
  profitMarginPercent: 0,
  byTrainer: [],
  byLocation: [],
  byLegalEntity: [],
  byClient: [],
  byPackage: [],
  byMonth: [],
};

export type MonthlyFinancePoint = {
  key: string;
  label: string;
  revenue: number;
  expense: number;
};

export function getBreakdownLabel(
  item: AnalyticsBreakdown,
  fallback = "Bez nazwy",
) {
  return firstText(
    item.label,
    item.name,
    item.trainerName,
    item.locationName,
    item.legalEntityName,
    item.clientName,
    item.packageName,
    item.paymentProvider,
    item.month,
  ) || fallback;
}

export function getBreakdownAmount(
  item: AnalyticsBreakdown,
  preferred: Array<keyof AnalyticsBreakdown> = [],
) {
  const keys: Array<keyof AnalyticsBreakdown> = [
    ...preferred,
    "profitAmount",
    "netAmount",
    "grossAmount",
    "revenueAmount",
    "revenueNetAmount",
    "revenueGrossAmount",
    "trainerCostAmount",
    "amount",
  ];

  for (const key of keys) {
    const value = toNumber(item[key]);
    if (value !== null) return value;
  }

  return 0;
}

export function getBreakdownCount(item: AnalyticsBreakdown) {
  return (
    toNumber(item.sessionsCount) ??
    toNumber(item.participantsCount) ??
    toNumber(item.count) ??
    0
  );
}

export function combineMonthlyData(
  revenueItems: AnalyticsBreakdown[] | null,
  expenseItems: AnalyticsBreakdown[] | null,
) {
  const points = new Map<string, MonthlyFinancePoint>();

  for (const item of revenueItems || []) {
    const key = getMonthKey(item);
    points.set(key, {
      key,
      label: formatMonthLabel(key),
      revenue: getBreakdownAmount(item, ["netAmount", "revenueNetAmount"]),
      expense: 0,
    });
  }

  for (const item of expenseItems || []) {
    const key = getMonthKey(item);
    const current = points.get(key) || {
      key,
      label: formatMonthLabel(key),
      revenue: 0,
      expense: 0,
    };
    current.expense = getBreakdownAmount(item, ["grossAmount"]);
    points.set(key, current);
  }

  return Array.from(points.values()).sort((first, second) =>
    first.key.localeCompare(second.key),
  );
}

export function getSessionId(session: TrainerCostSession, index: number) {
  return session.sessionId ?? session.id ?? index;
}

export function getSessionDate(session: TrainerCostSession) {
  return firstText(
    session.startAt,
    session.startsAt,
    session.sessionDate,
    session.date,
  );
}

export function getSessionNumber(
  session: TrainerCostSession,
  ...keys: Array<keyof TrainerCostSession>
) {
  for (const key of keys) {
    const value = toNumber(session[key]);
    if (value !== null) return value;
  }
  return 0;
}

export function numberFilter(value: string) {
  if (!value || value === "all") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function booleanFilter(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function getMonthKey(item: AnalyticsBreakdown) {
  return firstText(item.month, item.key, item.label, item.name) || "bez-daty";
}

function formatMonthLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("pl-PL", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
