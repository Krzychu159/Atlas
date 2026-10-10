import type { PackageType } from "@/app/lib/packageFilters";
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
  packageType?: PackageType | null;
  locationId?: number | null;
  locationIds?: number[] | null;
  locationName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
};

export function getTrainerPackages(signal?: AbortSignal) {
  return backendGet<TrainerPackage[]>("Packages", undefined, signal);
}
