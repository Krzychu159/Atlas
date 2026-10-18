import { backendGet, backendPost, invalidateBackendGets } from "@/app/lib/backend";

export type NotificationSeverity =
  | "Info"
  | "Critical"
  | "Information"
  | "Success"
  | "Warning"
  | "Error"
  | string;

export type AppNotification = {
  id: number;
  userId: number;
  type: string | null;
  category: string;
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
  unreadByCategory: Record<string, number>;
};

export type NotificationCategory = { key: string; label: string };
export type NotificationParams = { limit?: number; category?: string; isRead?: boolean };

export function getNotificationCategories(signal?: AbortSignal) {
  return backendGet<NotificationCategory[]>("Notifications/categories", undefined, signal);
}

export type ReadAllResponse = {
  markedAsRead: number;
};

export type NotificationRole = "owner" | "trainer" | "client";

export const NOTIFICATIONS_CHANGED_EVENT = "atlas:notifications-changed";

// readIds / readAll describe a local change that views apply without refetching;
// "poll" means the server count changed, so open views reload their list.
export type NotificationsChange = {
  unreadCountDelta?: number;
  readIds?: number[];
  readAll?: { category?: string };
  source?: "local" | "poll";
};

export function getNotifications(params: NotificationParams = {}, signal?: AbortSignal) {
  return backendGet<AppNotification[]>("Notifications", { ...params, limit: params.limit ?? 50 }, signal);
}

export function getNotificationsPage(params: NotificationParams & { page: number; pageSize: number }, signal?: AbortSignal) {
  return backendGet<{ items: AppNotification[] | null; totalCount: number; totalPages: number }>("Notifications/page", params, signal);
}

export function getUnreadNotificationCount(category?: string, signal?: AbortSignal) {
  return backendGet<UnreadCountResponse>("Notifications/unread-count", { category }, signal);
}

const pendingReads = new Map<number, Promise<void>>();

export function markNotificationAsRead(id: number) {
  const pending = pendingReads.get(id);
  if (pending) return pending;
  const request = backendPost<void>(`Notifications/${id}/read`)
    .then(result => {
      notifyNotificationsChanged({ unreadCountDelta: -1, readIds: [id] });
      return result;
    })
    .finally(() => { if (pendingReads.get(id) === request) pendingReads.delete(id); });
  pendingReads.set(id, request);
  return request;
}

export async function markAllNotificationsAsRead(category?: string) {
  const result = await backendPost<ReadAllResponse | null>("Notifications/read-all", undefined, { category });
  notifyNotificationsChanged({ unreadCountDelta: result ? -result.markedAsRead : undefined, readAll: { category } });
  return result;
}

export function notifyNotificationsChanged(change: NotificationsChange = {}) {
  if (typeof window !== "undefined") {
    invalidateBackendGets(["Notifications", "Notifications/page", "Notifications/unread-count"]);
    window.dispatchEvent(new CustomEvent<NotificationsChange>(NOTIFICATIONS_CHANGED_EVENT, { detail: { source: "local", ...change } }));
  }
}

export function getSafeNotificationUrl(actionUrl: string | null) {
  if (!actionUrl || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(actionUrl) || /[\\\s]/.test(actionUrl)) {
    return null;
  }
  const path = actionUrl.split(/[?#]/, 1)[0];
  if (!path || /(?:^|\/)\.{1,2}(?:\/|$)|%/i.test(path)) return null;
  return actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`;
}

// Only page.tsx routes present under app/(app), excluding notification history.
const notificationRoutes: Record<NotificationRole, RegExp> = {
  owner: /^\/owner(?:\/(?:schedule|settings|statistics|expenses|settlements|payments|packages(?:\/[1-9]\d*)?|clients(?:\/archived|\/[1-9]\d*(?:\/payments)?)?|trainers(?:\/[1-9]\d*(?:\/settlements)?)?))?$/,
  trainer: /^\/trainer(?:\/(?:schedule|settings|payments|settlements|packages|clients(?:\/[1-9]\d*(?:\/payments)?)?))?$/,
  client: /^\/client(?:\/(?:schedule|settings|payments|rewards))?$/,
};

export function normalizeNotificationRole(value: unknown): NotificationRole | null {
  const role = typeof value === "string" ? value.trim().toLowerCase() : "";
  return role === "owner" || role === "trainer" || role === "client" ? role : null;
}

function isNotificationRoute(path: string) {
  return Object.values(notificationRoutes).some(pattern => pattern.test(path.replace(/\/$/, "")));
}

function invitationDestination(notification: AppNotification, role: NotificationRole, params = new URLSearchParams()) {
  if (role !== "owner") return null;
  const target = `${notification.type ?? ""} ${notification.relatedEntityType ?? ""} ${params.get("role") ?? ""}`;
  const trainer = /trainer/i.test(target) || params.has("trainerId");
  if (!trainer && !/client/i.test(target) && !params.has("clientId")) return null;
  params.set("invitations", "true");
  return `/owner/${trainer ? "trainers" : "clients"}?${params}`;
}

function matchNotificationUrl(notification: AppNotification, role: NotificationRole | null) {
  const safe = getSafeNotificationUrl(notification.actionUrl);
  if (!safe) return null;
  const url = new URL(safe, "https://atlas.invalid");
  const path = url.pathname.replace(/\/$/, "");
  if (path === "/accept-invitation" && url.searchParams.get("token")) return safe;
  const domainPath = path.replace(/^\/(owner|trainer|client)(?=\/|$)/, "");
  const suffix = safe.slice(url.pathname.length);
  // A payment for a known client opens that client's payments tab, not the general list.
  const clientKey = Array.from(url.searchParams.keys()).find(key => key.toLowerCase() === "clientid");
  const paymentClientId = clientKey ? url.searchParams.get(clientKey) : null;
  if (clientKey && role && role !== "client" && /^\/(payments|billing)(?:\/payments)?(?:\/[1-9]\d*)?$/.test(domainPath) && paymentClientId && /^[1-9]\d*$/.test(paymentClientId)) {
    url.searchParams.delete(clientKey);
    const query = url.searchParams.toString();
    return `/${role}/clients/${paymentClientId}/payments${query ? `?${query}` : ""}${url.hash}`;
  }
  if (role ? notificationRoutes[role].test(path) : isNotificationRoute(path)) return safe;
  if (!role) return null;

  const candidate = `/${role}${domainPath}`;
  if (notificationRoutes[role].test(candidate)) return `${candidate}${suffix}`;

  const client = domainPath.match(/^\/clients\/([1-9]\d*)(?:\/(payments|billing|packages|subscriptions)(?:\/[1-9]\d*)?)?$/);
  if (client) {
    if (role === "client") return `/client/${client[2] ? "payments" : "settings"}${suffix}`;
    return `/${role}/clients/${client[1]}${client[2] ? "/payments" : ""}${suffix}`;
  }
  if (/^\/(sessions|schedule|group-classes)(?:\/[1-9]\d*)?$/.test(domainPath)) return `/${role}/schedule${suffix}`;
  if (/^\/(payments|billing)(?:\/[1-9]\d*)?$/.test(domainPath)) return `/${role}/payments${suffix}`;
  if (/^\/(client-packages|subscriptions)(?:\/[1-9]\d*)?$/.test(domainPath)) return `/${role}/payments${suffix}`;
  if (/^\/packages(?:\/[1-9]\d*)?$/.test(domainPath)) {
    return `/${role}/${role === "client" ? "payments" : "packages"}${suffix}`;
  }
  if (/^\/invitations(?:\/[1-9]\d*)?$/.test(domainPath)) return invitationDestination(notification, role, url.searchParams);
  if (domainPath === "/profile") return `/${role}/settings${suffix}`;
  if (domainPath === "/dashboard") return `/${role}${suffix}`;
  if (/^\/trainers\/[1-9]\d*$/.test(domainPath)) {
    return role === "trainer" ? `/trainer/settings${suffix}` : role === "client" ? `/client/schedule${suffix}` : null;
  }
  if (/^\/(?:trainers\/[1-9]\d*\/)?settlements(?:\/[1-9]\d*)?$/.test(domainPath) && role === "owner") return `/owner/settlements${suffix}`;
  if (/^\/(?:trainers\/[1-9]\d*\/)?settlements(?:\/[1-9]\d*)?$/.test(domainPath) && role === "trainer") return `/trainer/settlements${suffix}`;
  return null;
}

export function getNotificationDestination(notification: AppNotification, requestedRole?: string | null) {
  const role = normalizeNotificationRole(requestedRole);
  const destination = paymentClientDestination(notification, role, matchNotificationUrl(notification, role));
  if (destination) return destination;
  if (!role) return null;

  // Entity IDs identify their own entity, never an inferred client/trainer.
  const entity = notification.relatedEntityType?.toLowerCase() ?? "";
  const id = notification.relatedEntityId;
  const validId = typeof id === "number" && Number.isSafeInteger(id) && id > 0;
  const kind = /settlement/i.test(`${entity} ${notification.type ?? ""}`) ? "settlement" : getNotificationKind(notification);
  if (kind === "invitation") return invitationDestination(notification, role);
  if (kind === "session") return `/${role}/schedule`;
  if (entity === "client" && validId) {
    if (role === "client") return ["payment", "package", "subscription"].includes(kind) ? "/client/payments" : "/client/settings";
    return `/${role}/clients/${id}${["payment", "package", "subscription"].includes(kind) ? "/payments" : ""}`;
  }
  if (entity === "trainer" && validId) {
    const settlement = kind === "settlement" || kind === "payment";
    if (role === "owner") return `/owner/trainers/${id}${settlement ? "/settlements" : ""}`;
    if (settlement) return role === "trainer" ? "/trainer/settlements" : null;
    return role === "trainer" ? "/trainer/settings" : "/client/schedule";
  }
  switch (kind) {
    case "payment":
    case "subscription": return `/${role}/payments`;
    case "package":
      if (role === "client") return "/client/payments";
      if (role === "owner" && entity === "package" && validId) return `/owner/packages/${id}`;
      return `/${role}/clients`;
    case "client": return role === "client" ? "/client/settings" : `/${role}/clients`;
    case "trainer": return role === "owner" ? "/owner/trainers" : role === "trainer" ? "/trainer/settings" : "/client/schedule";
    case "settlement": return role === "owner" ? "/owner/settlements" : role === "trainer" ? "/trainer/settlements" : null;
    case "expense": return role === "owner" ? "/owner/expenses" : null;
    default: return null;
  }
}

/** True for the general payments list, which a payment notification should avoid when the client is known. */
export function isGeneralPaymentsDestination(destination: string | null, role: NotificationRole | null) {
  return Boolean(destination && role && role !== "client" && destination.split(/[?#]/, 1)[0].replace(/\/$/, "") === `/${role}/payments`);
}

/** The payment a notification refers to, when its entity or address identifies one. */
export function getNotificationPaymentId(notification: AppNotification) {
  const entity = notification.relatedEntityType ?? "";
  const id = notification.relatedEntityId;
  if (/payment/i.test(entity) && !/settlement|configuration|provider/i.test(entity) && typeof id === "number" && Number.isSafeInteger(id) && id > 0) return id;
  const safe = getSafeNotificationUrl(notification.actionUrl);
  if (!safe) return null;
  const url = new URL(safe, "https://atlas.invalid");
  const fromQuery = Array.from(url.searchParams.entries()).find(([key]) => key.toLowerCase() === "paymentid")?.[1];
  const fromPath = url.pathname.match(/\/(?:billing\/)?payments\/([1-9]\d*)\/?$/)?.[1];
  const value = fromQuery ?? fromPath;
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

// Payment notifications open the client's payments tab whenever the notification itself names the client.
function paymentClientDestination(notification: AppNotification, role: NotificationRole | null, destination: string | null) {
  if (!role || role === "client" || getNotificationKind(notification) !== "payment") return destination;
  const profile = destination?.match(/^\/(?:owner|trainer)\/clients\/([1-9]\d*)\/?([?#].*)?$/);
  if (profile) return `/${role}/clients/${profile[1]}/payments${profile[2] ?? ""}`;
  const clientId = notification.relatedEntityId;
  const knownClient = notification.relatedEntityType?.toLowerCase() === "client" && typeof clientId === "number" && Number.isSafeInteger(clientId) && clientId > 0;
  if (knownClient && (!destination || isGeneralPaymentsDestination(destination, role))) return `/${role}/clients/${clientId}/payments`;
  return destination;
}

// Keep the clicked preview available across client-side navigation if marking it
// read moves it beyond the backend's first page. Never persist notification data.
let preview: { item: AppNotification; expires: number } | null = null;
export function clearNotificationMemory() {
  pendingReads.clear();
  preview = null;
}
export function rememberNotificationPreview(item: AppNotification) {
  preview = { item, expires: Date.now() + 60_000 };
}
export function getNotificationPreview(id: number) {
  return preview?.item.id === id && preview.expires > Date.now() ? preview.item : null;
}

// Fetch only the notification addressed by the deep link.
export async function findNotificationInList(id: number, isActive = () => true) {
  if (!Number.isSafeInteger(id) || id <= 0 || !isActive()) return null;
  const item = await backendGet<AppNotification>(`Notifications/${id}`);
  return isActive() ? item : null;
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
