import { backendFetch } from "../backend";

export type Location = {
  id: number;
  name: string | null;
  city: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

export function getLocations() {
  return backendFetch<Location[]>("Locations");
}
