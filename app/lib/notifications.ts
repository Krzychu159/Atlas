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

export function getNotificationCategories() {
  return backendGet<NotificationCategory[]>("Notifications/categories");
}

export type ReadAllResponse = {
  markedAsRead: number;
};

export type NotificationRole = "owner" | "trainer" | "client";

export const NOTIFICATIONS_CHANGED_EVENT = "atlas:notifications-changed";

export function getNotifications(params: NotificationParams = {}) {
  return backendGet<AppNotification[]>("Notifications", { ...params, limit: params.limit ?? 50 });
}

export function getUnreadNotificationCount(category?: string) {
  return backendGet<UnreadCountResponse>("Notifications/unread-count", { category });
}

const pendingReads = new Map<number, Promise<void>>();

export function markNotificationAsRead(id: number) {
  const pending = pendingReads.get(id);
  if (pending) return pending;
  const request = backendPost<void>(`Notifications/${id}/read`)
    .then(result => {
      notifyNotificationsChanged();
      return result;
    })
    .finally(() => pendingReads.delete(id));
  pendingReads.set(id, request);
  return request;
}

export async function markAllNotificationsAsRead(category?: string) {
  const result = await backendPost<ReadAllResponse | null>("Notifications/read-all", undefined, { category });
  notifyNotificationsChanged();
  return result;
}

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export function getSafeNotificationUrl(actionUrl: string | null) {
  if (!actionUrl?.startsWith("/") || actionUrl.startsWith("//") || /[\\\s]/.test(actionUrl)) {
    return null;
  }

  return actionUrl;
}

// Normalize only known legacy app routes; never infer a destination from event text.
export function getNotificationDestination(notification: AppNotification, role: NotificationRole) {
  const raw = notification.actionUrl?.trim();
  if (!raw || raw.startsWith("//") || /[\\\\\s]/.test(raw) || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  const path = raw.startsWith("/") ? raw : "/" + raw;
  const section = path.split(/[/?#]/)[1];
  if (["owner", "trainer", "client"].includes(section)) return path;
  const sections: Record<NotificationRole, string[]> = {
    owner: ["clients", "schedule", "trainers", "payments", "packages", "settings", "notifications", "settlements", "expenses", "statistics"],
    trainer: ["clients", "schedule", "payments", "packages", "settings", "notifications"],
    client: ["schedule", "payments", "settings", "rewards"],
  };
  return sections[role].includes(section) ? "/" + role + path : getSafeNotificationUrl(raw);
}

// Keep the clicked preview available across client-side navigation if marking it
// read moves it beyond the backend's first page. Never persist notification data.
let preview: { item: AppNotification; expires: number } | null = null;
export function rememberNotificationPreview(item: AppNotification) {
  preview = { item, expires: Date.now() + 60_000 };
}
export function getNotificationPreview(id: number) {
  return preview?.item.id === id && preview.expires > Date.now() ? preview.item : null;
}

// The contract has no GET-by-id endpoint. Increase the supported list limit for
// an older deep link, stopping if the list is exhausted or the server caps it.
export async function findNotificationInList(id: number, isActive = () => true) {
  let previousCount = 0;
  for (let limit = 100; isActive(); limit *= 2) {
    const items = await getNotifications({ limit });
    if (!isActive()) return null;
    const item = items.find(notification => notification.id === id);
    if (item) return item;
    if (items.length < limit || items.length <= previousCount) return null;
    previousCount = items.length;
  }
  return null;
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
