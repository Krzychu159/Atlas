import { backendFetch } from "../backend";

export type ClientStatus = "active" | "suspended" | "new" | string;

export type Client = {
  id: number;
  trainerId: number;
  activePackageId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  goal: string;
  notes: string;
  progressPercent: number;
  billingStatus: string;
  status: ClientStatus;
  nextSessionAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  trainerFullName: string;
  locationId: number;
  locationName: string;
};

export type CreateClientPayload = {
  trainerId: number;
  activePackageId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  goal: string;
  notes: string;
  progressPercent: number;
  billingStatus: string;
  status: string;
  nextSessionAt: string | null;
  createdBy: number;
  locationId: number;
};

export function getClients() {
  return backendFetch<Client[]>("Clients");
}

export function createClient(payload: CreateClientPayload) {
  return backendFetch<Client>("Clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
