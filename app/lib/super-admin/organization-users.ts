import { ApiError, backendGet, backendPut } from "@/app/lib/backend";
import type { Organization } from "./organizations";

export type StaffRole = "Owner" | "Trainer";
export type Account = { userId: number; fullName: string; email: string; accountStatus: "Active" | "Inactive"; emailVerified: boolean };
export type OrganizationUser = Omit<Account, "emailVerified"> & { roles: StaffRole[]; membershipStatus: "Legacy" | "Registered" };
export type UserPage<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Nie udało się odczytać listy użytkowników.");
  return value as Record<string, unknown>;
}
function identity(value: unknown) {
  const source = object(value);
  if (!Number.isSafeInteger(source.userId) || (source.userId as number) <= 0 || typeof source.fullName !== "string" || typeof source.email !== "string" || !source.email.trim() || !["Active", "Inactive"].includes(String(source.accountStatus))) throw new Error("Nie udało się odczytać danych użytkownika.");
  return { userId: source.userId as number, fullName: source.fullName, email: source.email, accountStatus: source.accountStatus as Account["accountStatus"] };
}
export function parseAccount(value: unknown): Account {
  const source = object(value);
  if (typeof source.emailVerified !== "boolean") throw new Error("Nie udało się potwierdzić danych konta.");
  return { ...identity(value), emailVerified: source.emailVerified };
}
export function parseOrganizationUser(value: unknown): OrganizationUser {
  const source = object(value);
  if (!Array.isArray(source.roles) || source.roles.some(role => role !== "Owner" && role !== "Trainer") || !["Legacy", "Registered"].includes(String(source.membershipStatus))) throw new Error("Nie udało się odczytać ról użytkownika.");
  return { ...identity(value), roles: source.roles as StaffRole[], membershipStatus: source.membershipStatus as OrganizationUser["membershipStatus"] };
}
export function parseUserPage<T>(value: unknown, requestedPage: number, parse: (item: unknown) => T): UserPage<T> {
  const source = object(value);
  if (!Array.isArray(source.items) || !Number.isSafeInteger(source.total) || (source.total as number) < 0 || source.page !== requestedPage || source.pageSize !== 25 || source.items.length > 25 || source.items.length > (source.total as number)) throw new Error("Nie udało się odczytać listy użytkowników.");
  return { items: source.items.map(parse), total: source.total as number, page: requestedPage, pageSize: 25, totalPages: Math.ceil((source.total as number) / 25) };
}
function checkPage(page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new Error("Wybierz poprawną stronę listy.");
}
export async function getOrganizationUsers(organizationId: string, role: StaffRole | undefined, page: number, signal?: AbortSignal) {
  checkPage(page);
  if (role !== undefined && role !== "Owner" && role !== "Trainer") throw new Error("Wybierz dostępną rolę.");
  const response = await backendGet<unknown>(`super-admin/organizations/${encodeURIComponent(organizationId)}/users`, { ...(role ? { role } : {}), page, pageSize: 25 }, signal);
  return parseUserPage(response, page, parseOrganizationUser);
}
export function validAccountQuery(query: string) { return query.trim().length >= 3 && query.trim().length <= 100; }
export async function searchAccounts(query: string, page: number, signal?: AbortSignal) {
  checkPage(page);
  if (!validAccountQuery(query)) throw new Error("Wpisz od 3 do 100 znaków.");
  return parseUserPage(await backendGet<unknown>("super-admin/users", { query: query.trim(), page, pageSize: 25 }, signal), page, parseAccount);
}
export function canSelectAccount(account: Account) { return Number.isSafeInteger(account.userId) && account.userId > 0 && account.accountStatus === "Active" && account.emailVerified === true; }
export function canAssignOwner(organization: Organization) {
  return organization.status === "Draft" && organization.crmAccessEnabled === false && organization.revision !== undefined && Number.isSafeInteger(organization.revision) && organization.revision >= 0;
}
export function validOwnerReason(reason: string) { return Boolean(reason.trim()) && reason.length <= 1000; }
export async function assignOwner(organization: Organization, account: Account, reason: string) {
  if (!canAssignOwner(organization) || !canSelectAccount(account) || !validOwnerReason(reason)) throw new Error("Sprawdź organizację, konto i powód przypisania.");
  // Success may have an empty body; the confirmed contract does not specify a DTO.
  await backendPut<unknown>(`super-admin/organizations/${encodeURIComponent(organization.organizationId)}/owners/${account.userId}`, { expectedRevision: organization.revision, reason });
}
export function userManagementMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Sprawdź dane. Wybrane konto może nie spełniać warunków przypisania właściciela.";
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz uprawnień do zarządzania użytkownikami tej organizacji.";
    if (error.status === 404) return "Nie znaleziono organizacji lub konta. Ta funkcja może nie być jeszcze dostępna.";
    if (error.status === 409) return "Dane organizacji zmieniły się lub przypisanie nie jest dozwolone. Sprawdź aktualne dane i ponownie potwierdź wybór.";
  }
  return "Nie udało się potwierdzić wyniku. Odśwież dane i sprawdź je przed kolejną próbą.";
}
