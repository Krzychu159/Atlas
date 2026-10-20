import type { SelectOption } from "@/app/components/ui/custom-select";

export type LocationLoadStatus = "loading" | "ready" | "error";

// Placeholder option for a location select, so an empty list is never shown before the read finishes.
export function locationSelectOptions(status: LocationLoadStatus, options: SelectOption[]): SelectOption[] {
  if (options.length) return options;
  if (status === "loading") return [{ value: "", label: "Wczytywanie lokalizacji…" }];
  if (status === "error") return [{ value: "", label: "Nie udało się pobrać lokalizacji" }];
  return [{ value: "", label: "Brak aktywnych lokalizacji" }];
}

export function locationListMessage(status: LocationLoadStatus) {
  if (status === "loading") return "Wczytywanie lokalizacji…";
  if (status === "error") return "Nie udało się pobrać lokalizacji. Zamknij okno i otwórz je ponownie.";
  return "Brak lokalizacji do wyboru.";
}
