import type { AppNotification } from "@/app/lib/notifications";

const categoryLabels: Record<string, string> = {
  payments: "Płatności",
  packages: "Pakiety",
  schedule: "Grafik",
  invitations: "Zaproszenia",
  trainers: "Trenerzy",
  group_classes: "Zajęcia grupowe",
  registrations: "Zapisy",
  system: "System",
};

export function notificationCategoryLabel(category: string | null | undefined) {
  return category && Object.hasOwn(categoryLabels, category) ? categoryLabels[category] : null;
}

function startOfDay(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

const DAY = 86_400_000;
const timeFormat = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });

export function formatNotificationTime(createdAt: string, now = Date.now()) {
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time)) return "";

  const minutes = Math.floor((now - time) / 60_000);
  if (minutes >= 0 && minutes < 1) return "Teraz";
  if (minutes >= 0 && minutes < 60) return `${minutes} min temu`;

  const today = startOfDay(now);
  if (time >= today) return timeFormat.format(time);
  if (time >= today - DAY) return `wczoraj, ${timeFormat.format(time)}`;

  const sameYear = new Date(time).getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
}

export type NotificationGroup = { key: string; label: string; items: AppNotification[] };

// Items arrive newest first; grouping keeps that order.
export function groupNotificationsByDay(items: readonly AppNotification[], now = Date.now()): NotificationGroup[] {
  const today = startOfDay(now);
  const groups: NotificationGroup[] = [];

  for (const item of items) {
    const time = Date.parse(item.createdAt);
    const day = Number.isFinite(time) ? startOfDay(time) : null;
    const key = day === null ? "unknown" : String(day);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = { key, label: dayLabel(day, today), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}

function dayLabel(day: number | null, today: number) {
  if (day === null) return "Bez daty";
  if (day === today) return "Dziś";
  if (day === today - DAY) return "Wczoraj";
  const sameYear = new Date(day).getFullYear() === new Date(today).getFullYear();
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) }).format(day);
}

export function pluralizeNotifications(count: number) {
  if (count === 1) return "1 powiadomienie";
  const last = count % 10;
  const lastTwo = count % 100;
  return `${count} ${last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "powiadomienia" : "powiadomień"}`;
}
