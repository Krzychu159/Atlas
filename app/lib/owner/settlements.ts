import {
  backendDownload,
  backendGet,
  backendPost,
  backendPut,
} from "../backend";
import { getTrainers, type Trainer } from "./trainers";

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

function emptySettlement(
  trainer: Trainer,
  year: number,
  month: number,
): TrainerMonthlySettlement {
  return {
    trainerId: trainer.id,
    locationId: null,
    trainerFullName:
      trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
    year,
    month,
    totalHours: 0,
    totalSessions: 0,
    totalAmount: 0,
    contractedTotalHours: 0,
    contractedTotalSessions: 0,
    contractedTotalAmount: 0,
    nonContractedTotalHours: 0,
    nonContractedTotalSessions: 0,
    isPaid: false,
    paidAt: null,
    items: [],
    nonContractedItems: [],
  };
}

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

export async function getOwnerTrainerSettlements(year: number, month: number, locationId: number | null = null) {
  const trainers = await getTrainers();
  const results = await Promise.allSettled(
    trainers.map((trainer) => getTrainerSettlement(trainer.id, year, month, locationId ?? undefined)),
  );

  return trainers.map((trainer, index) => {
    const result = results[index];

    if (result.status === "fulfilled") {
      return result.value;
    }

    return emptySettlement(trainer, year, month);
  }).filter((settlement) => locationId === null || settlement.totalSessions > 0);
}
