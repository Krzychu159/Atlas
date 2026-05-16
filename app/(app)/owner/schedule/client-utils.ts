import type { Client } from "@/app/lib/owner/clients";

export function getClientDisplayName(client: Client) {
  const fullName = client.fullName?.trim();
  const composedName = `${client.firstName || ""} ${client.lastName || ""}`.trim();

  return fullName || composedName || `Klient #${client.id}`;
}

export function getClientShortName(client: Client) {
  const fullName = getClientDisplayName(client);
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || fullName;
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

  return lastName
    ? `${firstName} ${lastName.charAt(0).toUpperCase()}`
    : firstName;
}

export function getSuggestedSessionTitle(clientIds: string[], clients: Client[]) {
  const clientsById = new Map(
    clients.map((client) => [String(client.id), client]),
  );

  return clientIds
    .map((clientId) => clientsById.get(clientId))
    .filter((client): client is Client => Boolean(client))
    .map(getClientShortName)
    .join(" + ");
}

export function normalizeSearch(value: string) {
  return value.toLowerCase().trim();
}

export function isActiveClientForSession(client: Client) {
  const status = normalizeSearch(
    client.subscriptionStatus || client.status || "",
  );

  if (
    status.includes("inactive") ||
    status.includes("suspended") ||
    status.includes("cancel") ||
    status.includes("paused") ||
    status.includes("archived")
  ) {
    return false;
  }

  if (client.hasActivePackage === false || client.isPackageActive === false) {
    return false;
  }

  return true;
}

export function matchesClientSearch(client: Client, query: string) {
  if (!query) return true;

  const haystack = [
    getClientDisplayName(client),
    client.email,
    client.phoneNumber,
    client.trainerFullName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}
