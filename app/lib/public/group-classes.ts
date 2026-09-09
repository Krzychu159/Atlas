import { backendFetch } from "../backend";

export type PublicLocation = { id: number; name: string; city: string | null; address: string | null };
export type PublicGroupPackage = {
  id: number; name: string; description: string | null; price: number; currency: string;
  entriesCount: number; durationDays: number; locationId: number; locationName: string; publicSlug: string;
};
export type PublicGroupClass = {
  id: number; title: string; note: string | null; startAt: string; endAt: string;
  trainerId: number; trainerFullName: string | null; locationId: number; locationName: string;
  capacity: number; bookedSeats: number; availableSeats: number; isFullyBooked: boolean;
  isBookedByCurrentClient: boolean; publicSlug: string;
};
export type PublicRegistrationPayload = {
  email: string; password: string; firstName: string; lastName: string; phoneNumber: string; locationId: number;
};
// Tokens are deliberately consumed only by the BFF and never returned to the browser.
export type PublicRegistrationResponse = { ok: boolean; user: { userId: number | string; email?: string; role: string } };
export type GroupPackagePurchase = {
  clientPackageId: number; packageId: number; packageName: string; amountDue: number; currency: string;
  paymentStatus: string; entriesCount: number; remainingEntries: number; validUntil: string | null; message?: string;
};
export type GroupClassBooking = {
  sessionId: number; clientId: number; sessionParticipantId: number; clientPackageId: number;
  status: string; remainingEntries: number;
};
const base = "public/group-classes";
const publicOptions = { skipUnauthorizedRedirect: true };
export const getPublicLocations = () => backendFetch<PublicLocation[]>(`${base}/locations`, publicOptions);
export const getPublicPackages = (locationId: number) => backendFetch<PublicGroupPackage[]>(`${base}/packages`, { ...publicOptions, query: { locationId } });
export const getPublicPackageBySlug = (slug: string) => backendFetch<PublicGroupPackage>(`${base}/packages/by-slug/${encodeURIComponent(slug)}`, publicOptions);
export const getPublicGroupClasses = (query: { locationId: number; from: string; to: string; limit?: number }) => backendFetch<PublicGroupClass[]>(base, { ...publicOptions, query: { ...query, limit: query.limit ?? 50 } });
export const getPublicGroupClass = (id: number) => backendFetch<PublicGroupClass>(`${base}/${id}`, publicOptions);
export const getPublicGroupClassBySlug = (slug: string) => backendFetch<PublicGroupClass>(`${base}/by-slug/${encodeURIComponent(slug)}`, publicOptions);
export const purchaseGroupPackage = (packageId: number) => backendFetch<GroupPackagePurchase>(`${base}/packages/${packageId}/purchases/me`, { ...publicOptions, method: "POST" });
export const bookGroupClass = (sessionId: number) => backendFetch<GroupClassBooking>(`${base}/${sessionId}/bookings/me`, { ...publicOptions, method: "POST" });
export const cancelGroupClassBooking = (sessionId: number) => backendFetch<void>(`${base}/${sessionId}/bookings/me`, { ...publicOptions, method: "DELETE" });
export const reportGroupPayment = (payload: { clientPackageId: number; amount: number; method: number; paymentDate: string; note: string }) => backendFetch("client-portal/payments", { ...publicOptions, method: "POST", json: payload });

export async function authenticatePublicClient(payload: { email: string; password: string } | PublicRegistrationPayload, register = false): Promise<PublicRegistrationResponse> {
  const response = await fetch(register ? "/api/auth/public-register" : "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.user) throw new Error(typeof result?.message === "string" ? result.message : "Nie udało się zalogować. Spróbuj ponownie.");
  return result;
}
export const registerPublicClient = (payload: PublicRegistrationPayload) => authenticatePublicClient(payload, true);
