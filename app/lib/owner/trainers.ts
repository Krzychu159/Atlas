import { backendFetch } from "../backend";

export type Trainer = {
  id: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  bio: string;
  phone: string;
  avatarUrl: string;
  status: string;
  experienceYears: number;
  ratingAverage: number;
  sessionsCount: number;
  activeClientsCount: number;
  hourlyRate: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  locationIds: number[];
  locationNames: string[];
};

export type CreateTrainerPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bio: string;
  phone: string;
  avatarUrl: string;
  status: string;
  experienceYears: number;
  hourlyRate: number;
  createdBy: number;
  locationIds: number[];
};

export function getTrainers() {
  return backendFetch<Trainer[]>("Trainers");
}

export function getTrainer(id: number) {
  return backendFetch<Trainer>(`Trainers/${id}`);
}

export function createTrainer(payload: CreateTrainerPayload) {
  return backendFetch<Trainer>("Trainers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
