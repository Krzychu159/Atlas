import { backendGet, backendPost, backendPatch, ApiError } from "@/app/lib/backend";

export const ORGANIZATIONS_PAGE_SIZE = 25;

export type Organization = {
  organizationId: string;
  name: string;
  slug: string;
  uiVariant: string;
  status?: "Draft" | "Active" | "LegacyActive";
  revision?: number;
  crmAccessEnabled?: boolean;
  accessMode?: "SetupOnly" | "FullCrm" | "Unavailable";
};

export type OrganizationPage = {
  items: Organization[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Contract: { items, total, page, pageSize }; each item contains
// { organizationId, name, slug, uiVariant }. Reject missing or invalid fields.

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Nie udało się odczytać danych organizacji. Spróbuj ponownie później.");
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

export function parseOrganization(value: unknown): Organization {
  const source = object(value);
  const organizationId = source.organizationId;
  const validId = requiredText(organizationId) || (typeof organizationId === "number" && Number.isSafeInteger(organizationId) && organizationId >= 0);
  if (!validId || !requiredText(source.name) || !requiredText(source.slug) || !requiredText(source.uiVariant)) {
    throw new Error("Nie udało się odczytać danych organizacji. Spróbuj ponownie później.");
  }
  if (("status" in source && source.status !== "Draft" && source.status !== "Active" && source.status !== "LegacyActive") ||
      ("revision" in source && (!Number.isSafeInteger(source.revision) || (source.revision as number) < 0)) ||
      ("crmAccessEnabled" in source && typeof source.crmAccessEnabled !== "boolean") ||
      ("accessMode" in source && !["SetupOnly", "FullCrm", "Unavailable"].includes(String(source.accessMode)))) {
    throw new Error("Nie udało się odczytać danych organizacji. Spróbuj ponownie później.");
  }
  return {
    organizationId: String(organizationId),
    name: source.name as string,
    slug: source.slug,
    uiVariant: source.uiVariant,
    ...("status" in source ? { status: source.status as Organization["status"] } : {}),
    ...("revision" in source ? { revision: source.revision as number } : {}),
    ...("crmAccessEnabled" in source ? { crmAccessEnabled: source.crmAccessEnabled as boolean } : {}),
    ...("accessMode" in source ? { accessMode: source.accessMode as Organization["accessMode"] } : {}),
  };
}

export type OrganizationFormValues = { name: string; slug: string; uiVariant: string; reason: string };
export type ManagedOrganization = Organization & { status: "Draft" | "Active" | "LegacyActive"; revision: number; crmAccessEnabled: boolean };

export function validateOrganizationForm(values: OrganizationFormValues) {
  const errors: Partial<Record<keyof OrganizationFormValues, string>> = {};
  if (!values.name.trim() || values.name.length > 100) errors.name = "Podaj nazwę organizacji (1–100 znaków).";
  if (values.slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) errors.slug = "Użyj małych liter, cyfr i pojedynczych myślników (do 100 znaków).";
  if (!["default", "bsworkout"].includes(values.uiVariant)) errors.uiVariant = "Wybierz dostępny wariant interfejsu.";
  if (!values.reason.trim() || values.reason.length > 1000) errors.reason = "Podaj powód (1–1000 znaków).";
  return errors;
}

function mutationValues(values: OrganizationFormValues) {
  if (Object.keys(validateOrganizationForm(values)).length) throw new Error("Sprawdź pola formularza.");
  return { name: values.name, slug: values.slug, uiVariant: values.uiVariant, reason: values.reason };
}

export function parseManagedOrganization(value: unknown): ManagedOrganization {
  const organization = parseOrganization(value);
  if (organization.status === undefined || organization.revision === undefined || organization.crmAccessEnabled === undefined) {
    throw new Error("Nie udało się potwierdzić zapisanych danych. Odśwież organizację przed kolejną zmianą.");
  }
  return organization as ManagedOrganization;
}

export async function createOrganization(values: OrganizationFormValues) {
  const organization = parseManagedOrganization(await backendPost<unknown>("super-admin/organizations", { ...mutationValues(values), initialOwnerUserId: null }));
  if (organization.status !== "Draft" || organization.crmAccessEnabled !== false || organization.revision !== 0) throw new Error("Nie udało się potwierdzić nowej organizacji. Sprawdź listę organizacji przed ponownym utworzeniem.");
  return organization;
}

export async function updateOrganization(organizationId: string, expectedRevision: number, values: OrganizationFormValues) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error("Odśwież dane organizacji przed zapisem.");
  const organization = parseManagedOrganization(await backendPatch<unknown>(`super-admin/organizations/${encodeURIComponent(organizationId)}`, { ...mutationValues(values), expectedRevision }));
  if (organization.organizationId !== organizationId) throw new Error("Nie udało się potwierdzić zapisanych danych tej organizacji.");
  return organization;
}

export function organizationMutationMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Sprawdź dane formularza. Nie udało się ich zapisać.";
    if (error.status === 409) return "Dane organizacji zmieniły się lub wybrany kod organizacji jest już zajęty. Sprawdź aktualne dane i ponownie wprowadź zmiany.";
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz uprawnień do zmiany organizacji.";
    if (error.status === 404) return "Nie znaleziono organizacji lub ta funkcja nie jest jeszcze dostępna.";
  }
  return "Nie udało się potwierdzić zapisu. Sprawdź aktualne dane przed kolejną próbą.";
}

export function parseOrganizationPage(value: unknown, requestedPage: number): OrganizationPage {
  const source = object(value);
  if (!Array.isArray(source.items) || !Number.isSafeInteger(source.total) || (source.total as number) < 0) {
    throw new Error("Nie udało się odczytać listy organizacji. Spróbuj ponownie później.");
  }
  const page = source.page;
  const pageSize = source.pageSize;
  if (!Number.isSafeInteger(page) || (page as number) < 1 || !Number.isSafeInteger(pageSize) || (pageSize as number) < 1) {
    throw new Error("Nie udało się odczytać listy organizacji. Spróbuj ponownie później.");
  }
  const total = source.total as number;
  const totalPages = Math.ceil(total / (pageSize as number));
  if (page !== requestedPage || pageSize !== ORGANIZATIONS_PAGE_SIZE || source.items.length > (pageSize as number) || source.items.length > total) {
    throw new Error("Nie udało się odczytać listy organizacji. Spróbuj ponownie później.");
  }
  return { items: source.items.map(parseOrganization), page: page as number, pageSize: pageSize as number, total, totalPages };
}

export async function getOrganizations(page: number, signal?: AbortSignal) {
  const response = await backendGet<unknown>("super-admin/organizations", { page, pageSize: ORGANIZATIONS_PAGE_SIZE }, signal);
  return parseOrganizationPage(response, page);
}

export async function getOrganization(organizationId: string, signal?: AbortSignal) {
  const response = await backendGet<unknown>(`super-admin/organizations/${encodeURIComponent(organizationId)}`, undefined, signal);
  const organization = parseOrganization(response);
  if (organization.organizationId !== organizationId) throw new Error("Nie udało się odczytać danych tej organizacji. Spróbuj ponownie później.");
  return organization;
}

export function filterOrganizations(items: Organization[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("pl");
  return items.filter(item => [item.name, item.slug, item.organizationId, item.uiVariant].some(value => value.toLocaleLowerCase("pl").includes(normalized)));
}
