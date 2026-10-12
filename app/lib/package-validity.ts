export function isPackageExpired(value?: string | null, now = Date.now()) {
  if (!value) return false;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant <= now;
}

export function packageTrainingKind(packageType?: string | null, billingType?: string | number | null): "group" | "individual" | "unknown" {
  if (packageType === "Group") return "group";
  if (packageType === "Individual" || packageType === "SemiPersonal") return "individual";
  if ([5, "5", "Group", "GroupTraining"].includes(billingType ?? "")) return "group";
  if ([1, 2, 3, 4, "1", "2", "3", "4", "OneToOne", "TwoToOne", "ThreeToOne", "FourToOne", "PersonalTraining", "DuoTraining"].includes(billingType ?? "")) return "individual";
  return "unknown";
}

export function canDecidePackageExpiry(item: { isActive: boolean; validUntil: string | null; closedAt: string | null; closureDisposition: string | null }) {
  return item.isActive === true && !item.closedAt && !item.closureDisposition && isPackageExpired(item.validUntil);
}

export function formatPackageInstant(value?: string | null) {
  if (!value) return "Brak daty";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Data niedostępna";
}

export function packageInstantToLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localPackageInstantToUtc(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  // Reject invalid calendar dates and local times skipped by daylight saving.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date.toISOString();
}
