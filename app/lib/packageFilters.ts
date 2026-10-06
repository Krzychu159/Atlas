export type ParticipantsFilter = "all" | "solo" | "duo" | "trio" | "four" | "group";
export type SessionsFilter = "all" | "1-4" | "5-8" | "9-12" | "13+";
export type DurationFilter = "all" | "up-to-30" | "31-60" | "61-90" | "over-90";
export type PackageSort = "newest" | "oldest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
export type PackageType = "Individual" | "SemiPersonal" | "Group";

type FilterablePackage = {
  name: string | null;
  description: string | null;
  locationName?: string | null;
  packageType?: PackageType | null;
  participantsCount?: number | null;
  sessionsLimit: number;
  durationDays: number;
  price: number;
  createdAt: string;
};

export function isGroupPackage(participantsCount?: number | null, packageType?: PackageType | null) {
  return packageType === "Group" || (participantsCount != null && participantsCount > 4);
}

export function formatParticipantsLabel(participantsCount?: number | null, packageType?: PackageType | null) {
  if (isGroupPackage(participantsCount, packageType)) return "Grupowe";
  if (participantsCount === 1) return "1 osoba";
  if (participantsCount === 2 || participantsCount === 3 || participantsCount === 4) {
    return `${participantsCount} osoby`;
  }
  return "Nie określono liczby osób";
}

export function filterPackages<T extends FilterablePackage>(
  packages: readonly T[],
  filters: {
    search: string;
    participantsFilter: ParticipantsFilter;
    sessionsFilter: SessionsFilter;
    durationFilter: DurationFilter;
    sort: PackageSort;
  },
): T[] {
  const query = filters.search.toLocaleLowerCase("pl").trim();
  const participantCounts = { solo: 1, duo: 2, trio: 3, four: 4 };

  const result = packages.filter((item) => {
    if (query && ![item.name, item.description, item.locationName, item.packageType]
      .some((value) => value?.toLocaleLowerCase("pl").includes(query))) return false;

    const group = isGroupPackage(item.participantsCount, item.packageType);
    if (filters.participantsFilter === "group") {
      if (!group) return false;
    } else if (filters.participantsFilter !== "all") {
      if (group || item.participantsCount !== participantCounts[filters.participantsFilter]) return false;
    }

    const sessions = item.sessionsLimit;
    switch (filters.sessionsFilter) {
      case "1-4": if (!(sessions >= 1 && sessions <= 4)) return false; break;
      case "5-8": if (!(sessions >= 5 && sessions <= 8)) return false; break;
      case "9-12": if (!(sessions >= 9 && sessions <= 12)) return false; break;
      case "13+": if (!(sessions >= 13)) return false; break;
    }

    const days = item.durationDays;
    switch (filters.durationFilter) {
      case "up-to-30": if (!(days <= 30)) return false; break;
      case "31-60": if (!(days >= 31 && days <= 60)) return false; break;
      case "61-90": if (!(days >= 61 && days <= 90)) return false; break;
      case "over-90": if (!(days > 90)) return false; break;
    }
    return true;
  });

  return [...result].sort((first, second) => {
    switch (filters.sort) {
      case "price-asc": return first.price - second.price;
      case "price-desc": return second.price - first.price;
      case "name-asc": return (first.name ?? "").localeCompare(second.name ?? "", "pl");
      case "name-desc": return (second.name ?? "").localeCompare(first.name ?? "", "pl");
      case "oldest": return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
      default: return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    }
  });
}
