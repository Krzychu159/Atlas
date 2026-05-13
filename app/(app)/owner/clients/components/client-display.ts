import type { Client } from "@/app/lib/owner/clients";

function firstNumber(...values: Array<number | null | undefined>) {
  return (
    values.find((value) => typeof value === "number" && !Number.isNaN(value)) ??
    null
  );
}

export function getClientName(client: Client) {
  const name = client.fullName || `${client.firstName} ${client.lastName}`;

  return name.trim() || "Klient bez nazwy";
}

export function getClientBalance(client: Client) {
  return (
    firstNumber(
      client.balance,
      client.balanceAmount,
      client.accountBalance,
      client.currentBalance,
      client.billingBalance,
    ) ?? 0
  );
}

export function formatClientBalance(client: Client) {
  const currency = client.balanceCurrency || client.currency || "PLN";

  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(getClientBalance(client));
  } catch {
    return `${getClientBalance(client)} zł`;
  }
}

export function hasActiveClientPackage(client: Client) {
  if (typeof client.hasActivePackage === "boolean") {
    return client.hasActivePackage;
  }

  if (typeof client.isPackageActive === "boolean") {
    return client.isPackageActive;
  }

  if (typeof client.activePackageId === "number") {
    return client.activePackageId > 0;
  }

  const subscriptionStatus = (client.subscriptionStatus || "").toLowerCase();

  if (!subscriptionStatus) return false;

  return (
    subscriptionStatus.includes("active") ||
    subscriptionStatus.includes("pendingpayment") ||
    subscriptionStatus.includes("cancelrequested")
  );
}

export function getClientPackageUsage(client: Client) {
  const hasPackage = hasActiveClientPackage(client);
  const limit = firstNumber(client.packageSessionsLimit, client.sessionsLimit);
  const directUsed = firstNumber(
    client.packageSessionsUsed,
    client.usedSessions,
    client.sessionsUsed,
  );
  const remaining = firstNumber(client.remainingSessions);

  const used =
    directUsed ??
    (limit !== null && remaining !== null
      ? Math.max(0, limit - remaining)
      : null);

  const normalizedLimit = limit && limit > 0 ? limit : null;
  const normalizedUsed = Math.max(
    0,
    Math.min(used ?? 0, normalizedLimit ?? used ?? 0),
  );
  const percent = normalizedLimit
    ? Math.round((normalizedUsed / normalizedLimit) * 100)
    : 0;

  const packageName =
    client.currentPackageName ||
    client.activePackageName ||
    client.packageName ||
    (hasPackage ? "Aktywny pakiet" : "Brak aktywnego pakietu");

  return {
    packageName,
    used: normalizedUsed,
    limit: normalizedLimit,
    percent,
    label: normalizedLimit
      ? `${normalizedUsed}/${normalizedLimit}`
      : hasPackage
        ? "Brak danych"
        : "Brak pakietu",
  };
}
