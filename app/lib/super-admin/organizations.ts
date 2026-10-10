import { backendGet } from "@/app/lib/backend";

export const ORGANIZATIONS_PAGE_SIZE = 25;

export type Organization = {
  organizationId: string;
  name: string;
  slug: string;
  uiVariant: string;
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
  return {
    organizationId: String(organizationId),
    name: source.name as string,
    slug: source.slug,
    uiVariant: source.uiVariant,
  };
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
