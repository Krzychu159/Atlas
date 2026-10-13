import type { Package, UpdatePackagePayload } from "@/app/lib/owner/packages";
import { isPeriodPackage, type PackageBillingMode } from "@/app/lib/period-packages";

export function generatePackageSlug(name: string) {
  return name.toLowerCase().replace(/ł/g, "l").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createPackageForm(item?: Package, defaultLocationId: number | null = null) {
  return {
    billingMode: (item && isPeriodPackage(item) ? "PeriodBased" : "SessionBased") as PackageBillingMode,
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? String(item.price) : "",
    currency: item?.currency || "PLN",
    sessionsLimit: item ? String(item.sessionsLimit) : "",
    sessionsPerWeek: item ? String(item.sessionsPerWeek ?? "") : "1",
    durationDays: item ? String(item.durationDays) : "",
    participantsCount: item ? String(item.participantsCount ?? "") : "1",
    billingType: String(item?.billingType ?? 1),
    locationId: String(item?.locationId ?? defaultLocationId ?? ""),
    isActive: item?.isActive ?? true,
    isPubliclyAvailable: item?.isPubliclyAvailable ?? false,
    publicSlug: item?.publicSlug ?? "",
    slugEdited: Boolean(item?.publicSlug),
  };
}

export type PackageForm = ReturnType<typeof createPackageForm>;

export function changePackageField<K extends keyof PackageForm>(form: PackageForm, field: K, value: PackageForm[K]): PackageForm {
  const next = { ...form, [field]: value };
  if (next.billingMode === "PeriodBased") { next.isPubliclyAvailable = false; next.publicSlug = ""; return next; }
  if (field === "publicSlug") next.slugEdited = true;
  if (field === "billingType" && value !== "5") next.isPubliclyAvailable = false;
  if (!next.slugEdited && next.billingType === "5" && (field === "name" || field === "isPubliclyAvailable" || field === "billingType")) {
    next.publicSlug = generatePackageSlug(next.name);
  }
  return next;
}

export function packageFormPayload(form: PackageForm): UpdatePackagePayload {
  if (form.billingMode === "PeriodBased") {
    if (!form.name.trim()) throw new Error("Podaj nazwę usługi.");
    if (!form.price.trim() || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) throw new Error("Cena usługi musi być równa lub większa od zera.");
    const durationDays = Number(form.durationDays);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3660) throw new Error("Czas trwania musi wynosić od 1 do 3660 dni.");
    if (!form.currency.trim()) throw new Error("Podaj walutę usługi.");
    if (!Number.isSafeInteger(Number(form.locationId)) || Number(form.locationId) <= 0) throw new Error("Wybierz lokalizację usługi.");
    return { name: form.name.trim(), description: form.description, billingMode: "PeriodBased", price: Number(form.price), currency: form.currency.trim().toUpperCase(), durationDays, locationId: Number(form.locationId), isActive: form.isActive, isPubliclyAvailable: false, publicSlug: null };
  }
  if (form.isPubliclyAvailable) {
    if (form.billingType !== "5") throw new Error("Publiczny pakiet musi być grupowy.");
    if (!form.name.trim()) throw new Error("Podaj nazwę pakietu.");
    for (const [label, value] of [["Cena", form.price], ["Liczba wejść", form.sessionsLimit], ["Ważność w dniach", form.durationDays]]) {
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw new Error(`${label} musi być większa od zera.`);
    }
    if (!form.locationId || !Number.isFinite(Number(form.locationId)) || Number(form.locationId) <= 0) throw new Error("Wybierz lokalizację publicznego pakietu.");
    if (!form.publicSlug.trim()) throw new Error("Podaj końcówkę linku.");
  }
  return {
    billingMode: "SessionBased",
    name: form.name,
    description: form.description,
    price: Number(form.price || 0),
    currency: form.currency || "PLN",
    sessionsLimit: Number(form.sessionsLimit || 0),
    durationDays: Number(form.durationDays || 0),
    billingType: Number(form.billingType || 1),
    ...(form.sessionsPerWeek !== "" ? { sessionsPerWeek: Number(form.sessionsPerWeek) } : {}),
    ...(form.participantsCount !== "" ? { participantsCount: Number(form.participantsCount) } : {}),
    locationId: form.locationId ? Number(form.locationId) : null,
    isActive: form.isActive,
    isPubliclyAvailable: form.isPubliclyAvailable,
    publicSlug: form.billingType === "5" ? form.publicSlug.trim() || null : null,
  };
}
