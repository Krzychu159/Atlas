import { backendFetch } from "../backend";

export type Package = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  sessionsLimit: number;
  durationDays: number;
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
  durationDays: number;
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
  return backendFetch<Package[]>("Packages");
}

export function getPackage(id: number) {
  return backendFetch<Package>(`Packages/${id}`);
}

export function createPackage(payload: CreatePackagePayload) {
  return backendFetch<Package>("Packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePackage(id: number, payload: UpdatePackagePayload) {
  return backendFetch<Package>(`Packages/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePackage(id: number) {
  return backendFetch<void>(`Packages/${id}`, {
    method: "DELETE",
  });
}

export function restorePackage(id: number) {
  return backendFetch<void>(`Packages/${id}/restore`, {
    method: "POST",
  });
}

export function getDeletedPackages() {
  return backendFetch<Package[]>("Packages/deleted");
}

/**
 * Docelowo:
 * GET /api/Packages/{id}/clients
 *
 * Na razie backend tego nie ma, więc page.tsx używa mocka po catch.
 */
export function getPackageClients(id: number) {
  return backendFetch<PackageClient[]>(`Packages/${id}/clients`);
}
