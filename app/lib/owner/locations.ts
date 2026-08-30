import { backendGet } from "../backend";

export type Location = {
  id: number;
  name: string | null;
  city: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  legalEntityId?: number | null;
  legalEntityName?: string | null;
};

export function getLocations() {
  return backendGet<Location[]>("Locations");
}
