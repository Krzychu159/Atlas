import {
  backendDelete,
  backendGet,
  backendPost,
  backendPut,
} from "../backend";

export type Package = {
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

export type CreatePackagePayload = {
  name: string;
  description: string;
  price: number;
  currency: string;
  sessionsLimit: number;
  sessionsPerWeek?: number;
  durationDays: number;
  billingType?: number;
  participantsCount?: number | null;
  locationId?: number | null;
  isActive: boolean;
  createdBy: number;
};

export type UpdatePackagePayload = {
  name: string;
  description: string;
  price: number;
  currency: string;
  sessionsLimit: number;
  durationDays: number;
  isActive: boolean;
};

export type PackageClient = {
  id: number;
  fullName: string;
  email?: string;
  avatarUrl?: string | null;
  joinedAt: string;
  usedSessions: number;
  sessionsLimit: number;
  status?: string;
};

export function getPackages() {
  return backendGet<Package[]>("Packages");
}

export function getPackage(id: number) {
  return backendGet<Package>(`Packages/${id}`);
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

/**
 * Docelowo:
 * GET /api/Packages/{id}/clients
 *
 * Na razie backend tego nie ma, więc page.tsx używa mocka po catch.
 */
export function getPackageClients(id: number) {
  return backendGet<PackageClient[]>(`Packages/${id}/clients`);
}
