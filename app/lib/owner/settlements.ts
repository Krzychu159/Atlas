import {
  backendDownload,
  backendGet,
  backendPost,
  backendPut,
} from "../backend";
import type { PagedResult } from "./billing";

export type TrainerRate = {
  id: number;
  trainerId: number;
  sessionType: string | null;
  rate: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
};

export function getActiveTrainerHourlyRate(rates: readonly TrainerRate[]) {
  return rates.find((rate) => rate.isActive && rate.sessionType === "Hourly")
    ?? rates.find((rate) => rate.isActive && !rate.sessionType);
}

export type TrainerSettlementItem = {
  sessionId: number;
  startAt: string;
  endAt: string;
  title: string | null;
  sessionType: string | null;
  locationId: number;
  locationName: string | null;
  isCoveredByContract: boolean;
  contractId: number | null;
  contractNumber: string | null;
  hours: number;
  rate: number;
  rateType: string | null;
  amount: number;
  participantsCount: number;
};

export type TrainerMonthlySettlement = {
  trainerId: number;
  locationId: number | null;
  trainerFullName: string | null;
  year: number;
  month: number;
  totalHours: number;
  totalSessions: number;
  totalAmount: number;
  contractedTotalHours: number;
  contractedTotalSessions: number;
  contractedTotalAmount: number;
  nonContractedTotalHours: number;
  nonContractedTotalSessions: number;
  isPaid: boolean;
  paidAt: string | null;
  items: TrainerSettlementItem[] | null;
  nonContractedItems: TrainerSettlementItem[] | null;
};

export function getTrainerRates(trainerId: number, signal?: AbortSignal) {
  return backendGet<TrainerRate[]>(`Trainers/${trainerId}/rates`, undefined, signal);
}

export function updateTrainerRates(
  trainerId: number,
  payload: UpdateTrainerRatesPayload,
) {
  return backendPut<TrainerRate[]>(`Trainers/${trainerId}/rates`, payload);
}

export type UpdateTrainerRatesPayload = {
  hourlyRate?: number | null;
  groupSessionRate?: number | null;
};

export function getTrainerSettlement(
  trainerId: number,
  year: number,
  month: number,
  locationId?: number,
) {
  return backendGet<TrainerMonthlySettlement>(
    `Trainers/${trainerId}/settlement`,
    { year, month, locationId },
  );
}

export function markTrainerSettlementAsPaid(
  trainerId: number,
  year: number,
  month: number,
) {
  return backendPost<TrainerMonthlySettlement>(
    `trainers/${trainerId}/settlement/mark-as-paid`,
    undefined,
    { year, month },
  );
}

export function reopenTrainerSettlement(
  trainerId: number,
  year: number,
  month: number,
) {
  return backendPost<TrainerMonthlySettlement>(
    `trainers/${trainerId}/settlement/reopen`,
    undefined,
    { year, month },
  );
}

export function downloadTrainerWorkHoursDocument(
  trainerId: number,
  year: number,
  month: number,
  locationId?: number,
) {
  return backendDownload(
    `trainers/${trainerId}/settlement/work-hours-document`,
    { year, month, locationId },
  );
}

export type OwnerSettlementSummary = { totalAmount: number; paidAmount: number; unpaidAmount: number; trainersCount: number; paidTrainersCount: number };
export type OwnerSettlementItem = Pick<TrainerMonthlySettlement, "trainerId" | "trainerFullName" | "totalHours" | "totalSessions" | "totalAmount" | "isPaid" | "paidAt" | "nonContractedTotalHours" | "nonContractedTotalSessions">;
export type OwnerSettlementPage = PagedResult<OwnerSettlementItem> & { year: number; month: number; locationId: number | null; summary: OwnerSettlementSummary; asOf: string; timeZone: string };
export async function getOwnerTrainerSettlements(year: number, month: number, locationId: number | null = null, query: { search?: string; page?: number; pageSize?: number } = {}, signal?: AbortSignal) {
  const result = await backendGet<OwnerSettlementPage>("owner/trainer-settlements", { year, month, locationId, ...query }, signal);
  const summary = result?.summary;
  if (!summary || ![summary.totalAmount, summary.paidAmount, summary.unpaidAmount].every(value => typeof value === "number" && Number.isFinite(value)) ||
    ![summary.trainersCount, summary.paidTrainersCount].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("Nie udało się odczytać podsumowania rozliczeń. Spróbuj ponownie.");
  }
  return result;
}
