import type { Trainer } from "@/app/lib/owner/trainers";

export type TrainerStatus = "active" | "inactive" | "paused" | "unknown";
export type TrainerStatusFilter = "all" | "active" | "inactive" | "paused";
export type TrainerSort = "name-asc" | "name-desc" | "sessions-desc" | "experience-desc" | "newest";

export type TrainerListFiltersValue = {
  search: string;
  status: TrainerStatusFilter;
  sort: TrainerSort;
};

export const defaultTrainerListFilters: TrainerListFiltersValue = {
  search: "",
  status: "all",
  sort: "name-asc",
};

// Status values match the options of EditTrainerModal (Active / Inactive / Paused).
export function trainerStatus(trainer: Pick<Trainer, "status">): TrainerStatus {
  const normalized = (trainer.status || "").trim().toLowerCase();
  if (normalized === "active" || normalized === "inactive" || normalized === "paused") return normalized;
  return "unknown";
}

export function trainerStatusLabel(status: TrainerStatus) {
  return { active: "Aktywny", inactive: "Nieaktywny", paused: "Wstrzymany", unknown: "Status nieznany" }[status];
}

export function trainerFullName(trainer: Pick<Trainer, "fullName" | "firstName" | "lastName">) {
  return trainer.fullName?.trim() || [trainer.firstName, trainer.lastName].filter(Boolean).join(" ").trim() || "Trener bez nazwy";
}

export function trainerInitials(trainer: Pick<Trainer, "fullName" | "firstName" | "lastName">) {
  return trainerFullName(trainer)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Same fallback as the previous trainer card: bio describes the specialization.
export function trainerSpecialization(trainer: Pick<Trainer, "bio">) {
  return trainer.bio?.trim() || "Trener personalny";
}

export function trainerExperienceLabel(years: number | null | undefined) {
  if (typeof years !== "number" || !Number.isFinite(years) || years <= 0) return null;
  if (years === 1) return "1 rok";
  const lastTwo = years % 100;
  const last = years % 10;
  return `${years} ${last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "lata" : "lat"}`;
}

export function trainerSessionsCount(trainer: Pick<Trainer, "sessionsCount">) {
  return typeof trainer.sessionsCount === "number" && Number.isFinite(trainer.sessionsCount) ? trainer.sessionsCount : null;
}

export function filterTrainers<T extends Trainer>(trainers: readonly T[], filters: TrainerListFiltersValue): T[] {
  const query = filters.search.toLocaleLowerCase("pl").trim();

  const result = trainers.filter((trainer) => {
    if (filters.status !== "all" && trainerStatus(trainer) !== filters.status) return false;
    if (!query) return true;
    return [trainerFullName(trainer), trainer.email, trainer.phone, trainer.bio, ...(trainer.locationNames ?? [])]
      .some((value) => value?.toLocaleLowerCase("pl").includes(query));
  });

  return [...result].sort((first, second) => {
    switch (filters.sort) {
      case "name-desc": return trainerFullName(second).localeCompare(trainerFullName(first), "pl");
      case "sessions-desc": return (trainerSessionsCount(second) ?? -1) - (trainerSessionsCount(first) ?? -1);
      case "experience-desc": return (second.experienceYears ?? -1) - (first.experienceYears ?? -1);
      case "newest": return (Date.parse(second.createdAt) || 0) - (Date.parse(first.createdAt) || 0);
      default: return trainerFullName(first).localeCompare(trainerFullName(second), "pl");
    }
  });
}

// Masculine-personal noun: "2 trenerów" (dwóch trenerów), so only 1 is singular.
export function pluralizeTrainers(count: number) {
  return count === 1 ? "1 trener" : `${count} trenerów`;
}
