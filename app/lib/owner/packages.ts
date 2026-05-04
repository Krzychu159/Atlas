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

export function getPackages() {
  return backendFetch<Package[]>("Packages");
}

export function createPackage(payload: CreatePackagePayload) {
  return backendFetch<Package>("Packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deletePackage(id: number) {
  return backendFetch<void>(`Packages/${id}`, {
    method: "DELETE",
  });
}
