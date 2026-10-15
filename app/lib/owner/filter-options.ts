import { backendGet } from "../backend";
export type OwnerFilterOption = { id: number; name: string };
export type OwnerFilterOptions = { clients: OwnerFilterOption[]; trainers: OwnerFilterOption[] };
export function getOwnerFilterOptions(query: { search?: string; locationId?: number | null; limit?: number }, signal?: AbortSignal) {
  return backendGet<OwnerFilterOptions>("owner/filter-options", query, signal);
}
