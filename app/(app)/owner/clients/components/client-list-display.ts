import type { ClientListItem } from "@/app/lib/owner/clients";
import {
  getClientPackageUsage,
  hasActiveClientPackage,
} from "./client-display";

export type ClientStatusTone = "active" | "suspended" | "new" | "inactive" | "unknown";

export type ClientPackageSummary =
  | { kind: "session"; name: string; used: number; limit: number; remaining: number; percent: number; extraCount: number }
  | { kind: "period"; name: string; detail: string; extraCount: number }
  | { kind: "unknown"; name: string; detail: string; extraCount: number }
  | { kind: "none"; name: string };

// The owner list displays only values present in the list data; sorting keeps the legacy helpers.
export function clientPackageSummary(client: ClientListItem): ClientPackageSummary {
  const usage = getClientPackageUsage(client, true);
  const packages = client.activePackages ?? [];
  const primary = packages.find((item) => item.clientPackageId === client.activeClientPackageId) || packages[0];
  const extraCount = Math.max(0, packages.length - 1);

  if (primary?.billingMode === "PeriodBased") {
    const lastDay = usage.label.includes(" – ") ? usage.label.split(" – ")[1] : null;
    return { kind: "period", name: usage.packageName, detail: lastDay ? `Ważny do ${lastDay}` : "Okres ważności niedostępny", extraCount };
  }

  if (hasActiveClientPackage(client, true) === false) {
    return { kind: "none", name: "Brak aktywnego pakietu" };
  }

  if (usage.used !== null && usage.limit !== null && usage.sortPercent !== null) {
    return {
      kind: "session",
      name: usage.packageName,
      used: usage.used,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - usage.used),
      percent: usage.percent,
      extraCount,
    };
  }

  return { kind: "unknown", name: usage.packageName, detail: "Brak danych o wykorzystaniu", extraCount };
}

const SESSION_DOTS_EXACT_LIMIT = 20;
const SESSION_DOTS_PROPORTIONAL_COUNT = 10;

// Up to 20 sessions each dot is one session; larger packages use 10 proportional segments.
export function sessionDots(used: number, limit: number) {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null;
  const safeUsed = Math.min(Math.max(0, used), limit);
  if (limit <= SESSION_DOTS_EXACT_LIMIT) {
    return { variant: "exact" as const, total: limit, filled: safeUsed };
  }
  return {
    variant: "proportional" as const,
    total: SESSION_DOTS_PROPORTIONAL_COUNT,
    filled: Math.round((safeUsed / limit) * SESSION_DOTS_PROPORTIONAL_COUNT),
  };
}

export function clientStatus(client: Pick<ClientListItem, "status">): { tone: ClientStatusTone; label: string } {
  const normalized = (client.status || "").trim().toLowerCase();
  if (normalized === "active" || normalized === "aktywny") return { tone: "active", label: "Aktywny" };
  if (normalized === "suspended" || normalized === "zawieszony") return { tone: "suspended", label: "Zawieszony" };
  if (normalized === "new" || normalized === "nowy") return { tone: "new", label: "Nowy" };
  if (normalized === "inactive" || normalized === "nieaktywny") return { tone: "inactive", label: "Nieaktywny" };
  return { tone: "unknown", label: "Status nieznany" };
}

export function clientTrainerLabel(client: Pick<ClientListItem, "trainerFullName" | "trainerId">) {
  if (client.trainerFullName?.trim()) return { label: client.trainerFullName.trim(), assigned: true };
  if (typeof client.trainerId === "number" && client.trainerId > 0) return { label: "Brak danych o trenerze", assigned: true };
  return { label: "Nie przypisano", assigned: false };
}

export type ClientAmountDueTone = "due" | "settled" | "missing";

// Missing data stays "Brak danych"; it is never shown as 0,00 zł.
export function clientAmountDue(client: Pick<ClientListItem, "totalAmountDue" | "amountDueCurrency">): { label: string; tone: ClientAmountDueTone } {
  const value = client.totalAmountDue;
  if (typeof value !== "number" || !Number.isFinite(value)) return { label: "Brak danych", tone: "missing" };
  const currency = client.amountDueCurrency?.trim() || "PLN";
  const digits = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  let label: string;
  try {
    label = new Intl.NumberFormat("pl-PL", { style: "currency", currency, ...digits }).format(value);
  } catch {
    label = `${new Intl.NumberFormat("pl-PL", digits).format(value)} ${currency}`;
  }
  return { label, tone: value > 0 ? "due" : "settled" };
}

// Masculine-personal noun: "2 klientów" (dwóch klientów), so only 1 is singular.
export function pluralizeClients(count: number) {
  return count === 1 ? "1 klient" : `${count} klientów`;
}
