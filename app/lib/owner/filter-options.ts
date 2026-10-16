import { backendGet } from "../backend";
export type OwnerFilterOption = { id: number; name: string };
export type OwnerFilterOptions = { clients: OwnerFilterOption[]; trainers: OwnerFilterOption[] };
export async function getOwnerFilterOptions(query: { search?: string; locationId?: number | null; limit?: number }, signal?: AbortSignal) {
  const result = await backendGet<OwnerFilterOptions>("owner/filter-options", query, signal);
  const valid = (options: unknown): options is OwnerFilterOption[] => Array.isArray(options) && options.every(option => option && Number.isSafeInteger(option.id) && option.id > 0 && typeof option.name === "string" && option.name.trim().length > 0);
  if (!result || !valid(result.clients) || !valid(result.trainers)) throw new Error("Nie udało się odczytać dostępnych osób. Spróbuj ponownie.");
  return result;
}
