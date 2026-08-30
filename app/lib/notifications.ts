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
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
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
