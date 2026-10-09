import type { Client, ClientListItem } from "@/app/lib/owner/clients";
import type { Location } from "@/app/lib/owner/locations";
import type { CalendarSession } from "@/app/(app)/owner/schedule/types";
import type { Trainer } from "@/app/lib/owner/trainers";
import type {
  TrainerPortalClient,
  TrainerPortalClientDetails,
  TrainerPortalMe,
  TrainerPortalSession,
} from "./portal";

export function trainerPortalMeToTrainer(
  me: TrainerPortalMe | null,
): Trainer | null {
  if (!me?.trainerId) return null;

  const { firstName, lastName } = splitFullName(me.fullName);

  return {
    id: me.trainerId,
    userId: me.userId,
    email: me.email || "",
    firstName,
    lastName,
    fullName: me.fullName || [firstName, lastName].filter(Boolean).join(" "),
    role: "Trainer",
    bio: me.bio || "",
    phone: me.phone || "",
    avatarUrl: me.avatarUrl || "",
    status: me.status || "",
    experienceYears: me.experienceYears || 0,
    ratingAverage: 0,
    sessionsCount: 0,
    activeClientsCount: 0,
    hourlyRate: 0,
    createdAt: "",
    updatedAt: "",
    createdBy: 0,
    locationIds: me.locationIds || [],
    locationNames: me.locationNames || [],
    outlookCategoryName: me.outlookCategoryName || null,
  };
}

export function trainerPortalMeToLocations(
  me: TrainerPortalMe | null,
): Location[] {
  const ids = me?.locationIds || [];
  const names = me?.locationNames || [];

  return ids.map((id, index) => ({
    id,
    name: names[index] || `Lokalizacja ${id}`,
    city: names[index] || null,
    address: null,
    isActive: true,
    createdAt: "",
  }));
}

export function trainerPortalClientsToClients(
  clients: TrainerPortalClient[],
  me: TrainerPortalMe | null,
): Client[] {
  return clients.map((client) =>
    trainerPortalClientToClient(
      {
        ...client,
        id: client.clientId,
        firstName: null,
        lastName: null,
        notes: null,
        nextSessionAt: null,
        updatedAt: client.createdAt,
        createdBy: null,
        trainerId: me?.trainerId ?? null,
        trainerFullName: me?.fullName ?? null,
        activePackageId: client.activePackageId ?? null,
        locationId: resolveLocationId(client.locationName, me),
      },
      me,
    ),
  );
}

export function trainerPortalClientToClient(
  client: TrainerPortalClientDetails,
  _me: TrainerPortalMe | null,
): Client {
  const names = splitFullName(client.fullName);

  return {
    id: client.id,
    trainerId: client.trainerId,
    activePackageId: client.activePackageId ?? null,
    activeClientPackageId: client.activeClientPackageId ?? null,
    activeClientPackageName: client.activeClientPackageName ?? null,
    activePackageTotalSessions: client.activePackageTotalSessions ?? null,
    activePackageUsedSessions: client.activePackageUsedSessions ?? null,
    activePackageRemainingSessions:
      client.activePackageRemainingSessions ?? null,
    activePackagePaymentStatus: client.activePackagePaymentStatus ?? null,
    firstName: client.firstName || names.firstName,
    lastName: client.lastName || names.lastName,
    fullName:
      client.fullName ||
      [client.firstName, client.lastName].filter(Boolean).join(" "),
    email: client.email ?? null,
    phoneNumber: client.phoneNumber || "",
    avatarUrl: client.avatarUrl || "",
    goal: client.goal || "",
    notes: client.notes || "",
    billingStatus: client.billingStatus || "",
    status: client.status || "",
    hasActivePackage: client.hasActivePackage ?? null,
    isPackageActive: client.isPackageActive ?? null,
    activePackageName: client.activePackageName ?? null,
    currentPackageName: client.currentPackageName ?? null,
    packageName: client.packageName ?? null,
    packageSessionsUsed: client.packageSessionsUsed ?? null,
    packageSessionsLimit: client.packageSessionsLimit ?? null,
    usedSessions: client.usedSessions ?? null,
    sessionsUsed: client.sessionsUsed ?? null,
    sessionsLimit: client.sessionsLimit ?? null,
    remainingSessions: client.remainingSessions ?? null,
    balance: client.balance ?? null,
    balanceAmount: client.balanceAmount ?? null,
    accountBalance: client.accountBalance ?? null,
    currentBalance: client.currentBalance ?? null,
    billingBalance: client.billingBalance ?? null,
    currency: client.currency ?? null,
    balanceCurrency: client.balanceCurrency ?? null,
    trainingStartDate: client.trainingStartDate ?? null,
    nextSessionAt: client.nextSessionAt || null,
    createdAt: client.createdAt || "",
    updatedAt: client.updatedAt || "",
    createdBy: client.createdBy ?? undefined,
    trainerFullName: client.trainerFullName ?? "",
    locationId: client.locationId,
    locationName: client.locationName || "",
    emailContactUrl: client.emailContactUrl ?? "",
  };
}

export function trainerPortalClientsToListItems(
  clients: TrainerPortalClient[],
): ClientListItem[] {
  return trainerPortalClientsToClients(clients, null).map((client, index) => {
    const { locationId: _locationId, updatedAt: _updatedAt, ...item } = client;
    const source = clients[index];

    return {
      ...item,
      activePackageId: source.activePackageId,
      activeClientPackageId: source.activeClientPackageId,
      hasActivePackage: source.hasActivePackage,
      isPackageActive: source.isPackageActive,
    };
  });
}

export function trainerPortalSessionsToCalendarSessions({ sessions }: { sessions: TrainerPortalSession[] }): CalendarSession[] {
  return sessions.map((session) => ({
    id: session.sessionId,
    canEdit: session.canEdit,
    isGroupSession: session.isGroupSession,
    capacity: session.capacity,
    bookedSeats: session.bookedSeats,
    availableSeats: session.availableSeats,
    isFullyBooked: session.isFullyBooked,
    eventRules: session.eventRules,
    bookingRules: session.bookingRules,
    registrationClosesBeforeMinutes: session.registrationClosesBeforeMinutes,
    cancellationClosesBeforeMinutes: session.cancellationClosesBeforeMinutes,
    locationId: session.locationId,
    isPubliclyBookable: session.isPubliclyBookable,
    publicCapacity: session.publicCapacity,
    plannedSessionType: session.plannedSessionType,
    participants: session.participants,
    title: session.title,
    note: session.note,
    startAt: session.startAt,
    endAt: session.endAt,
    trainerId: session.trainerId,
    trainerFullName: session.trainerFullName,
    locationName: session.locationName,
    status: session.status,
    // This summary is not a participant list and must not be used for identity.
    clientsDisplayName: session.clientFullName,
    outlookCategories: session.outlookCategories ?? null,
    primaryOutlookCategory: session.primaryOutlookCategory ?? null,
    primaryOutlookCategoryColor: session.primaryOutlookCategoryColor ?? null,
    outlookCategoryColors: session.outlookCategoryColors ?? null,
  }));
}

function splitFullName(value?: string | null) {
  const parts = (value || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";

  return {
    firstName,
    lastName: parts.join(" "),
  };
}

function resolveLocationId(
  locationName: string | null | undefined,
  me: TrainerPortalMe | null,
) {
  const ids = me?.locationIds || [];
  const names = me?.locationNames || [];
  const normalized = normalize(locationName);
  const index = names.findIndex((name) => normalize(name) === normalized);

  return index >= 0 ? ids[index] ?? 0 : 0;
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}
