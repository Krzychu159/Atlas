import { backendGet, backendPost, backendPut } from "../backend";
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

export type TrainerSettlementItem = {
  sessionId: number;
  startAt: string;
  endAt: string;
  title: string | null;
  sessionType: string | null;
  hours: number;
  rate: number;
  amount: number;
  participantsCount: number;
};

export type TrainerMonthlySettlement = {
  trainerId: number;
  trainerFullName: string | null;
  year: number;
  month: number;
  totalHours: number;
  totalSessions: number;
  totalAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  items: TrainerSettlementItem[] | null;
};

function emptySettlement(
  trainer: Trainer,
  year: number,
  month: number,
): TrainerMonthlySettlement {
  return {
    trainerId: trainer.id,
    trainerFullName:
      trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
    year,
    month,
    totalHours: 0,
    totalSessions: 0,
    totalAmount: 0,
    isPaid: false,
    paidAt: null,
    items: [],
  };
}

export function getTrainerRates(trainerId: number) {
  return backendGet<TrainerRate[]>(`Trainers/${trainerId}/rates`);
}

export function updateTrainerRates(
  trainerId: number,
  payload: { hourlyRate: number | null },
) {
  return backendPut<TrainerRate[]>(`Trainers/${trainerId}/rates`, payload);
}

export function getTrainerSettlement(
  trainerId: number,
  year: number,
  month: number,
) {
  return backendGet<TrainerMonthlySettlement>(
    `Trainers/${trainerId}/settlement`,
    { year, month },
  );
}

export function markTrainerSettlementAsPaid(
  trainerId: number,
  year: number,
  month: number,
) {
  return backendPost<TrainerMonthlySettlement>(
    `Trainers/${trainerId}/settlement/mark-as-paid`,
    undefined,
    { year, month },
  );
}

export async function getOwnerTrainerSettlements(year: number, month: number) {
  const trainers = await getTrainers();
  const results = await Promise.allSettled(
    trainers.map((trainer) => getTrainerSettlement(trainer.id, year, month)),
  );

  return trainers.map((trainer, index) => {
    const result = results[index];

    if (result.status === "fulfilled") return result.value;

    return emptySettlement(trainer, year, month);
  });
}
