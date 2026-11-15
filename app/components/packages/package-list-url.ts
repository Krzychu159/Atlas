import type {
  DurationFilter,
  PackageActivityFilter,
  PackageModeFilter,
  PackageSort,
  ParticipantsFilter,
  SessionsFilter,
} from "@/app/lib/packageFilters";
import { defaultPackageListFilters, type PackageListFiltersValue } from "./PackageListFilters";

const MODES: readonly PackageModeFilter[] = ["all", "SessionBased", "PeriodBased"];
const PARTICIPANTS: readonly ParticipantsFilter[] = ["all", "solo", "duo", "trio", "four", "group"];
const SESSIONS: readonly SessionsFilter[] = ["all", "1-4", "5-8", "9-12", "13+"];
const DURATIONS: readonly DurationFilter[] = ["all", "up-to-30", "31-60", "61-90", "over-90"];
const ACTIVITY: readonly PackageActivityFilter[] = ["all", "active", "inactive"];
const SORTS: readonly PackageSort[] = ["newest", "oldest", "price-asc", "price-desc", "name-asc", "name-desc"];

export const PACKAGE_URL_KEYS = ["q", "mode", "participants", "sessions", "duration", "activity", "sort"] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((item) => item === value) ?? fallback;
}

export function packageFiltersFromUrl(params: { get(key: string): string | null }): PackageListFiltersValue {
  const d = defaultPackageListFilters;
  return {
    search: (params.get("q") ?? "").slice(0, 100),
    billingModeFilter: pick(params.get("mode"), MODES, d.billingModeFilter),
    participantsFilter: pick(params.get("participants"), PARTICIPANTS, d.participantsFilter),
    sessionsFilter: pick(params.get("sessions"), SESSIONS, d.sessionsFilter),
    durationFilter: pick(params.get("duration"), DURATIONS, d.durationFilter),
    activityFilter: pick(params.get("activity"), ACTIVITY, d.activityFilter),
    sort: pick(params.get("sort"), SORTS, d.sort),
  };
}

export function packageFiltersToUrl(filters: PackageListFiltersValue) {
  const d = defaultPackageListFilters;
  const unlessDefault = <T extends string>(value: T, fallback: T) => (value === fallback ? null : value);
  return {
    q: filters.search.trim() || null,
    mode: unlessDefault(filters.billingModeFilter, d.billingModeFilter),
    participants: unlessDefault(filters.participantsFilter, d.participantsFilter),
    sessions: unlessDefault(filters.sessionsFilter, d.sessionsFilter),
    duration: unlessDefault(filters.durationFilter, d.durationFilter),
    activity: unlessDefault(filters.activityFilter, d.activityFilter),
    sort: unlessDefault(filters.sort, d.sort),
  };
}
