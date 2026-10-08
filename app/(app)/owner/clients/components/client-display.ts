import type { ClientListItem } from "@/app/lib/owner/clients";

function firstNumber(...values: Array<number | null | undefined>) {
  return (
    values.find((value) => typeof value === "number" && !Number.isNaN(value)) ??
    null
  );
}

export function getClientName(client: ClientListItem) {
  const name = client.fullName || `${client.firstName} ${client.lastName}`;

  return name.trim() || "Klient bez nazwy";
}

export function getPortalAccessLabel(status: string | undefined, preserveMissingData = false) {
  const labels: Record<string, string> = {
    NoAccount: "Bez dostępu do panelu",
    Invited: "Zaproszony",
    Active: "Konto aktywne",
    Blocked: "Dostęp zablokowany",
  };

  if (!status && preserveMissingData) return "Status dostępu niedostępny";

  return (status ? labels[status] : undefined) || (status ? "Status dostępu niedostępny" : "Bez dostępu do panelu");
}

export function getClientBalance(client: ClientListItem): number;
export function getClientBalance(client: ClientListItem, preserveMissingData: boolean): number | null;
export function getClientBalance(client: ClientListItem, preserveMissingData = false) {
  return (
    firstNumber(
      client.currentBalance,
      client.balance,
      client.balanceAmount,
      client.accountBalance,
      client.billingBalance,
    ) ?? (preserveMissingData ? null : 0)
  );
}

export function formatClientBalance(client: ClientListItem, preserveMissingData = false) {
  const balance = getClientBalance(client, preserveMissingData);
  if (balance === null) return "Brak danych";

  const currency = client.balanceCurrency || client.currency || "PLN";
  const amount = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(balance);
  if (preserveMissingData && !client.balanceCurrency && !client.currency) return amount;

  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(balance);
  } catch {
    return preserveMissingData ? amount : `${balance} zł`;
  }
}

export function hasActiveClientPackage(client: ClientListItem): boolean;
export function hasActiveClientPackage(client: ClientListItem, preserveMissingData: boolean): boolean | null;
export function hasActiveClientPackage(client: ClientListItem, preserveMissingData = false) {
  // Array.filter passes the item index as the second argument.
  if (preserveMissingData === true) {
    if (typeof client.hasActivePackage === "boolean") return client.hasActivePackage;
    if (typeof client.isPackageActive === "boolean") return client.isPackageActive;
    if (typeof client.activeClientPackageId === "number") return client.activeClientPackageId > 0;
    if (typeof client.activePackageId === "number") return client.activePackageId > 0;
    if (client.activeClientPackageId === null || client.activePackageId === null) return false;
    return null;
  }

  if (typeof client.activeClientPackageId === "number") {
    return client.activeClientPackageId > 0;
  }

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

export function getClientPackageUsage(client: ClientListItem, preserveMissingData = false) {
  const hasPackage = hasActiveClientPackage(client, preserveMissingData);
  const limit = firstNumber(
    client.activePackageTotalSessions,
    client.packageSessionsLimit,
    client.sessionsLimit,
  );
  const directUsed = firstNumber(
    client.activePackageUsedSessions,
    client.packageSessionsUsed,
    client.usedSessions,
    client.sessionsUsed,
  );
  const remaining = firstNumber(
    client.activePackageRemainingSessions,
    client.remainingSessions,
  );

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
    (preserveMissingData && hasPackage === false ? "Brak aktywnego pakietu" : null) ||
    client.activeClientPackageName ||
    client.currentPackageName ||
    client.activePackageName ||
    client.packageName ||
    (hasPackage === null ? "Brak danych o pakiecie" : hasPackage ? "Aktywny pakiet" : "Brak aktywnego pakietu");

  const hasUsageData = hasPackage === true && used !== null && normalizedLimit !== null;
  const label = preserveMissingData
    ? hasPackage === false
      ? "Brak pakietu"
      : hasUsageData
        ? `${normalizedUsed}/${normalizedLimit}`
        : "Brak danych"
    : normalizedLimit
      ? `${normalizedUsed}/${normalizedLimit}`
      : hasPackage
        ? "Brak danych"
        : "Brak pakietu";

  return {
    packageName,
    used: preserveMissingData && used === null ? null : normalizedUsed,
    limit: normalizedLimit,
    percent,
    sortPercent: preserveMissingData && !hasUsageData ? null : percent,
    label,
    paymentStatus: client.activePackagePaymentStatus || client.billingStatus,
  };
}
