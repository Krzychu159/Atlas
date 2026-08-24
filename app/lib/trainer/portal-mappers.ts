import type { Client } from "@/app/lib/owner/clients";
import type { Location } from "@/app/lib/owner/locations";
import type { OwnerSession } from "@/app/lib/owner/sessions";
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
  me: TrainerPortalMe | null,
): Client {
  const names = splitFullName(client.fullName);

  return {
    id: client.id,
    trainerId: client.trainerId ?? me?.trainerId ?? null,
    activePackageId: client.activePackageId ?? null,
    firstName: client.firstName || names.firstName,
    lastName: client.lastName || names.lastName,
    fullName:
      client.fullName ||
      [client.firstName, client.lastName].filter(Boolean).join(" "),
    email: client.email || "",
    phoneNumber: client.phoneNumber || "",
    avatarUrl: client.avatarUrl || "",
    goal: client.goal || "",
    notes: client.notes || "",
    progressPercent: 0,
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
    createdBy: client.createdBy || 0,
    trainerFullName: client.trainerFullName || me?.fullName || "",
    locationId: client.locationId || resolveLocationId(client.locationName, me),
    locationName: client.locationName || "",
  };
}

export function trainerPortalSessionsToOwnerSessions({
  sessions,
  me,
  clients,
}: {
  sessions: TrainerPortalSession[];
  me: TrainerPortalMe | null;
  clients: Client[];
}): OwnerSession[] {
  return sessions.map((session) => {
    const client = findClientByName(clients, session.clientFullName);
    const locationId = resolveLocationId(session.locationName, me);
    const participants = client
      ? [
          {
            id: client.id,
            clientId: client.id,
            clientFullName: client.fullName,
            packageId: null,
            packageName: null,
            clientPackageId: null,
            attendanceStatus: null,
            countsAgainstPackage: true,
            isCountedFromPackage: true,
            sessionsCharged: 1,
            plannedBillingType: null,
            actualBillingType: null,
            expectedUnitPrice: 0,
            actualUnitPrice: 0,
            balanceDifference: 0,
            note: null,
          },
        ]
      : null;

    return {
      id: session.sessionId,
      title: session.title,
      note: session.note,
      startAt: session.startAt,
      endAt: session.endAt,
      trainerId: me?.trainerId || 0,
      trainerFullName: me?.fullName || null,
      locationId,
      locationName: session.locationName,
      status: session.status,
      plannedSessionType: null,
      actualSessionType: null,
      actualParticipantsCount: participants?.length || null,
      completedAt: null,
      participantsCount: participants?.length || (session.clientFullName ? 1 : 0),
      clientsDisplayName: session.clientFullName,
      participants,
      createdAt: session.startAt,
      updatedAt: session.startAt,
      createdBy: null,
      locationParticipantsCount: 0,
      locationLimit: 0,
      isLocationLimitExceeded: false,
      outlookCategories: null,
      primaryOutlookCategory: null,
    };
  });
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

  return ids[index] || ids[0] || 0;
}

function findClientByName(clients: Client[], name?: string | null) {
  const normalized = normalize(name);

  if (!normalized) return null;

  return (
    clients.find((client) => normalize(client.fullName) === normalized) || null
  );
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}
