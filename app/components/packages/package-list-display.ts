import type { Package } from "@/app/lib/owner/packages";
import { formatParticipantsLabel } from "@/app/lib/packageFilters";
import { packageTrainingKind } from "@/app/lib/package-validity";
import { isPeriodPackage, isSessionPackage } from "@/app/lib/period-packages";

type PackageListKind = "session" | "period" | "unknown";

export function packageListKind(item: Package): PackageListKind {
  if (isPeriodPackage(item)) return "period";
  return isSessionPackage(item) ? "session" : "unknown";
}

export function packageKindLabel(item: Package) {
  const kind = packageListKind(item);
  if (kind === "period") return { title: "Usługa okresowa", detail: "Rozliczana czasem" };
  if (kind === "session") {
    return { title: "Pakiet treningowy", detail: formatParticipantsLabel(item.participantsCount, item.packageType) };
  }
  return { title: "Inny rodzaj oferty", detail: "Sprawdź szczegóły pakietu" };
}

// Period-based offers have no session limit, so only the duration is shown for them.
export function packageLimitLabel(item: Package) {
  const duration = formatDays(item.durationDays);
  if (packageListKind(item) !== "session") {
    return { primary: duration ?? "Czas nieokreślony", secondary: null };
  }

  const entries = packageTrainingKind(item.packageType, item.billingType, item.billingMode) === "group";
  const limit = Number.isFinite(item.sessionsLimit) && item.sessionsLimit > 0
    ? `${item.sessionsLimit} ${entries ? pluralize(item.sessionsLimit, "wejście", "wejścia", "wejść") : pluralize(item.sessionsLimit, "sesja", "sesje", "sesji")}`
    : "Limit nieokreślony";

  return { primary: limit, secondary: duration ? `Ważność ${duration}` : "Ważność nieokreślona" };
}

export function packageLocationLabel(item: Package) {
  if (item.locationName) return item.locationName;
  if (item.locationId) return `Lokalizacja ${item.locationId}`;
  return "Bez przypisanej lokalizacji";
}

// isActive is the owner's availability switch ("Pakiet aktywny"); deleted packages are listed separately.
export function packageStatusLabel(item: Package) {
  const period = packageListKind(item) === "period";
  if (item.isActive) return period ? "Aktywna" : "Aktywny";
  return period ? "Nieaktywna" : "Nieaktywny";
}

export function pluralizePackages(count: number) {
  return `${count} ${pluralize(count, "pakiet", "pakiety", "pakietów")}`;
}

function formatDays(days: number) {
  if (!Number.isFinite(days) || days <= 0) return null;
  return `${days} ${days === 1 ? "dzień" : "dni"}`;
}

function pluralize(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  const lastTwo = count % 100;
  const last = count % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}
