import { backendGet, backendPost, backendPut } from "../backend";

export type TrainerContract = {
  id: number;
  trainerId: number;
  contractType: string | null;
  contractNumber: string | null;
  signedAt: string;
  validFrom: string;
  validTo: string | null;
  notes: string | null;
  isActive: boolean;
  isCurrent: boolean;
  isExpired: boolean;
  daysUntilEnd: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTrainerContractPayload = {
  contractType: string | null;
  contractNumber: string | null;
  signedAt: string;
  validFrom: string;
  validTo: string | null;
  notes: string | null;
};

export type UpdateTrainerContractPayload = CreateTrainerContractPayload & {
  isActive: boolean;
};

export function getTrainerContracts(trainerId: number) {
  return backendGet<TrainerContract[]>(`trainers/${trainerId}/contracts`);
}

export function getTrainerContract(trainerId: number, contractId: number) {
  return backendGet<TrainerContract>(
    `trainers/${trainerId}/contracts/${contractId}`,
  );
}

export function createTrainerContract(
  trainerId: number,
  payload: CreateTrainerContractPayload,
) {
  return backendPost<TrainerContract>(
    `trainers/${trainerId}/contracts`,
    payload,
  );
}

export function updateTrainerContract(
  trainerId: number,
  contractId: number,
  payload: UpdateTrainerContractPayload,
) {
  return backendPut<TrainerContract>(
    `trainers/${trainerId}/contracts/${contractId}`,
    payload,
  );
}
