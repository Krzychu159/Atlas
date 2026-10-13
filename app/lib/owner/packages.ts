import type { PackageType } from "@/app/lib/packageFilters";
import type { Client } from "./clients";
import type { PackageBillingMode } from "../period-packages";
import {
  backendDelete,
  backendGet,
  backendPost,
  backendPut,
} from "../backend";

export type Package = {
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
  isPubliclyAvailable?: boolean;
  publicSlug?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
};

export type CreatePackagePayload = {
  billingMode?: PackageBillingMode;
  name: string;
  description: string;
  price: number;
  currency: string;
  sessionsLimit?: number;
  sessionsPerWeek?: number;
  durationDays: number;
  billingType?: number;
  participantsCount?: number | null;
  locationId?: number | null;
  isActive: boolean;
  createdBy?: number | null;
  isPubliclyAvailable?: boolean;
  publicSlug?: string | null;
};

export type UpdatePackagePayload = {
  billingMode?: PackageBillingMode;
  name: string;
  description: string;
  price: number;
  currency: string;
  sessionsLimit?: number;
  durationDays: number;
  isActive: boolean;
  billingType?: number;
  sessionsPerWeek?: number;
  participantsCount?: number | null;
  locationId?: number | null;
  isPubliclyAvailable?: boolean;
  publicSlug?: string | null;
};

// GET Packages/{id}/clients returns ClientDto, not package membership details.
export type PackageClient = Client;

export function getPackages(query?: { locationId?: number; isActive?: boolean }, signal?: AbortSignal) {
  return backendGet<Package[]>("Packages", query, signal);
}

export function getPackage(id: number, signal?: AbortSignal) {
  return backendGet<Package>(`Packages/${id}`, undefined, signal);
}

export function createPackage(payload: CreatePackagePayload) {
  return backendPost<Package>("Packages", payload);
}

export function updatePackage(id: number, payload: UpdatePackagePayload) {
  return backendPut<Package>(`Packages/${id}`, payload);
}

export function deletePackage(id: number) {
  return backendDelete<void>(`Packages/${id}`);
}

export function restorePackage(id: number) {
  return backendPost<void>(`Packages/${id}/restore`);
}

export function getDeletedPackages() {
  return backendGet<Package[]>("Packages/deleted");
}

export function getPackageClients(id: number) {
  return backendGet<PackageClient[]>(`Packages/${id}/clients`);
}
