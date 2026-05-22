import { backendGet } from "@/app/lib/backend";

export type TrainerPackage = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  sessionsLimit: number;
  sessionsPerWeek?: number;
  durationDays: number;
  billingType?: number;
  participantsCount: number;
  locationId?: number | null;
  locationName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
};

export function getTrainerPackages() {
  return backendGet<TrainerPackage[]>("Packages");
}
