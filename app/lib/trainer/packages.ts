import type { PackageType } from "@/app/lib/packageFilters";
import { backendGet } from "@/app/lib/backend";
import type { PackageBillingMode } from "@/app/lib/period-packages";

export type TrainerPackage = {
  billingMode?: PackageBillingMode | null;
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

export function getTrainerPackages(signal?: AbortSignal, filters?: { locationId?: number; isActive?: boolean }) {
  return backendGet<TrainerPackage[]>("Packages", filters, signal);
}

export function getTrainerPackage(id: number, signal?: AbortSignal) {
  return backendGet<TrainerPackage>(`Packages/${id}`, undefined, signal);
}
