import { backendGet, backendPost } from "@/app/lib/backend";

export type NotificationSeverity =
  | "Information"
  | "Success"
  | "Warning"
  | "Error"
  | string;

export type AppNotification = {
  id: number;
  userId: number;
  type: string | null;
  severity: NotificationSeverity | null;
  title: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  actionUrl: string | null;
};

export type UnreadCountResponse = {
  unreadCount: number;
};

export type ReadAllResponse = {
  markedAsRead: number;
};

export type NotificationRole = "owner" | "trainer" | "client";

export const NOTIFICATIONS_CHANGED_EVENT = "atlas:notifications-changed";

export function getNotifications(limit = 50) {
  return backendGet<AppNotification[]>("notifications", { limit });
}

export function getUnreadNotificationCount() {
  return backendGet<UnreadCountResponse>("notifications/unread-count");
}

export async function markNotificationAsRead(id: number) {
  const result = await backendPost<void>(`notifications/${id}/read`);
  notifyNotificationsChanged();
  return result;
}

export async function markAllNotificationsAsRead() {
  const result = await backendPost<ReadAllResponse>("notifications/read-all");
  notifyNotificationsChanged();
  return result;
}

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export function getSafeNotificationUrl(actionUrl: string | null) {
  if (!actionUrl?.startsWith("/") || actionUrl.startsWith("//")) {
    return null;
  }

  return actionUrl;
}

export function getNotificationDestination(
  notification: AppNotification,
  role: NotificationRole,
) {
  const kind = getNotificationKind(notification);
  const entityId = notification.relatedEntityId;
  const action = parseNotificationAction(notification.actionUrl);

  if (kind === "client") {
    return role === "client"
      ? "/client"
      : buildClientPath(role, entityId || action.clientId);
  }

  if (kind === "trainer") {
    if (role === "owner" && entityId) return `/owner/trainers/${entityId}`;
    return role === "client" ? "/client" : `/${role}/settings`;
  }

  if (kind === "payment" || kind === "subscription") {
    if (role === "client") return "/client/payments";
    if (action.clientId) return buildClientPath(role, action.clientId, true);

    const query = action.searchParams.get("clientId");
    return query && /^\d+$/.test(query)
      ? `/${role}/payments?clientId=${query}`
      : `/${role}/payments`;
  }

  if (kind === "session") return `/${role}/schedule`;
  if (kind === "package") {
    if (role === "owner" && action.packageId) {
      return `/owner/packages/${action.packageId}`;
    }
    return `/${role}/packages`;
  }
  if (kind === "settlement") {
    return role === "owner" ? "/owner/settlements" : `/${role}/payments`;
  }
  if (kind === "expense") {
    return role === "owner" ? "/owner/expenses" : `/${role}/payments`;
  }
  if (kind === "contract") {
    const actionDestination = getDestinationFromAction(action, role);
    if (actionDestination) return actionDestination;
    if (role === "owner" && entityId) return `/owner/trainers/${entityId}`;
    return role === "client" ? "/client" : `/${role}/settings`;
  }
  if (kind === "location") {
    return `/${role}/settings`;
  }
  if (kind === "invitation") {
    return (
      getDestinationFromAction(action, role) ||
      (role === "owner" ? "/owner/clients" : getNotificationsPath(role))
    );
  }

  if (!getSafeNotificationUrl(notification.actionUrl)) return null;
  return getDestinationFromAction(action, role) || getNotificationsPath(role);
}

export function getNotificationKind(item: AppNotification) {
  const kind = `${item.relatedEntityType || ""} ${item.type || ""}`.toLowerCase();

  if (kind.includes("subscription")) return "subscription";
  if (kind.includes("payment") || kind.includes("billing")) return "payment";
  if (kind.includes("session") || kind.includes("schedule")) return "session";
  if (kind.includes("invitation")) return "invitation";
  if (kind.includes("contract")) return "contract";
  if (kind.includes("settlement")) return "settlement";
  if (kind.includes("expense")) return "expense";
  if (kind.includes("package")) return "package";
  if (kind.includes("client")) return "client";
  if (kind.includes("trainer")) return "trainer";
  if (kind.includes("location")) return "location";
  return "system";
}

function buildClientPath(
  role: Exclude<NotificationRole, "client">,
  clientId?: number | null,
  payments = false,
) {
  if (!clientId) return `/${role}/clients`;
  return `/${role}/clients/${clientId}${payments ? "/payments" : ""}`;
}

function parseNotificationAction(actionUrl: string | null) {
  const safeUrl = getSafeNotificationUrl(actionUrl);
  const empty = {
    clientId: null as number | null,
    packageId: null as number | null,
    segments: [] as string[],
    searchParams: new URLSearchParams(),
  };

  if (!safeUrl) return empty;

  const url = new URL(safeUrl, "https://atlas.local");
  const segments = url.pathname.split("/").filter(Boolean);
  const clientIndex = segments.findIndex((segment) =>
    ["client", "clients"].includes(segment.toLowerCase()),
  );
  const packageIndex = segments.findIndex((segment) =>
    ["package", "packages"].includes(segment.toLowerCase()),
  );
  const clientId =
    clientIndex >= 0 ? getNumericSegment(segments[clientIndex + 1]) : null;
  const packageId =
    packageIndex >= 0 ? getNumericSegment(segments[packageIndex + 1]) : null;
  const normalizedSegments = [...segments];
  if (normalizedSegments[0]?.toLowerCase() === "api") normalizedSegments.shift();
  if (
    ["owner", "trainer", "client"].includes(
      normalizedSegments[0]?.toLowerCase(),
    )
  ) {
    normalizedSegments.shift();
  }

  return {
    clientId,
    packageId,
    segments: normalizedSegments,
    searchParams: url.searchParams,
  };
}

function getNumericSegment(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

function getDestinationFromAction(
  action: ReturnType<typeof parseNotificationAction>,
  role: NotificationRole,
) {
  const section = action.segments[0]?.toLowerCase();

  if (["client", "clients"].includes(section)) {
    if (role === "client") return "/client";
    return buildClientPath(
      role,
      action.clientId,
      action.segments.some((segment) =>
        ["payment", "payments", "billing", "subscription"].includes(
          segment.toLowerCase(),
        ),
      ),
    );
  }
  if (["trainer", "trainers"].includes(section)) {
    if (role === "owner") {
      return action.segments[1]
        ? `/owner/trainers/${action.segments[1]}`
        : "/owner/trainers";
    }
    return role === "client" ? "/client" : `/${role}/settings`;
  }
  if (["payment", "payments", "billing", "subscription"].includes(section)) {
    const clientId = action.searchParams.get("clientId");
    if (role !== "client" && clientId && /^\d+$/.test(clientId)) {
      return `/${role}/payments?clientId=${clientId}`;
    }
    return `/${role}/payments`;
  }
  if (["session", "sessions", "schedule", "calendar"].includes(section)) {
    return `/${role}/schedule`;
  }
  if (["package", "packages"].includes(section)) {
    return role === "owner" && action.packageId
      ? `/owner/packages/${action.packageId}`
      : `/${role}/packages`;
  }
  if (["setting", "settings", "location", "locations"].includes(section)) {
    return `/${role}/settings`;
  }
  if (["notification", "notifications"].includes(section)) {
    return getNotificationsPath(role);
  }
  if (section === "expenses" && role === "owner") return "/owner/expenses";
  if (section === "settlements" && role === "owner") return "/owner/settlements";
  if (["dashboard", "home"].includes(section)) return `/${role}`;

  return null;
}

function getNotificationsPath(role: NotificationRole) {
  return role === "client" ? "/client" : `/${role}/notifications`;
}
