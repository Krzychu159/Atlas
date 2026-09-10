import type { Package, UpdatePackagePayload } from "@/app/lib/owner/packages";

export function generatePackageSlug(name: string) {
  return name.toLowerCase().replace(/ł/g, "l").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createPackageForm(item?: Package, defaultLocationId: number | null = null) {
  return {
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
  if (field === "publicSlug") next.slugEdited = true;
  if (field === "billingType" && value !== "5") next.isPubliclyAvailable = false;
  if (!next.slugEdited && next.billingType === "5" && (field === "name" || field === "isPubliclyAvailable" || field === "billingType")) {
    next.publicSlug = generatePackageSlug(next.name);
  }
  return next;
}

export function packageFormPayload(form: PackageForm): UpdatePackagePayload {
  if (form.isPubliclyAvailable) {
    if (form.billingType !== "5") throw new Error("Publiczny pakiet musi być grupowy.");
    if (!form.name.trim()) throw new Error("Podaj nazwę pakietu.");
    for (const [label, value] of [["Cena", form.price], ["Liczba wejść", form.sessionsLimit], ["Ważność w dniach", form.durationDays]]) {
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw new Error(`${label} musi być większa od zera.`);
    }
    if (!form.locationId || !Number.isFinite(Number(form.locationId)) || Number(form.locationId) <= 0) throw new Error("Wybierz lokalizację publicznego pakietu.");
    if (!form.publicSlug.trim()) throw new Error("Podaj publiczny slug.");
  }
  return {
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
