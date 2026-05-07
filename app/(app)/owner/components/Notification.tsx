import {
  CalendarDays,
  CircleUserRound,
  CreditCard,
  ExternalLink,
  Zap,
} from "lucide-react";

export type NotificationType = "payment" | "schedule" | "client" | "system";

export type NotificationItemData = {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  isUnread?: boolean;
};

function getIcon(type: NotificationType) {
  if (type === "payment") return <CreditCard size={22} />;
  if (type === "schedule") return <CalendarDays size={22} />;
  if (type === "client") return <CircleUserRound size={22} />;
  return <Zap size={22} />;
}

function getIconStyles(type: NotificationType) {
  if (type === "payment") return "bg-tertiary-container text-tertiary-light";
  if (type === "schedule") return "bg-primary text-on-primary";
  if (type === "client") return "bg-primary/20 text-primary-light";
  return "bg-surface-container-high text-on-surface-variant";
}

export default function NotificationItem({
  item,
  variant = "page",
}: {
  item: NotificationItemData;
  variant?: "page" | "panel";
}) {
  return (
    <div
      className={`relative rounded-[var(--radius-xl)] bg-surface-container p-5 ${
        item.isUnread && variant === "panel"
          ? "outline outline-1 outline-primary-light/30"
          : ""
      }`}
    >
      {item.isUnread && variant === "panel" ? (
        <div className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-primary-light" />
      ) : null}

      <div className="flex items-start gap-4">
        <div
          className={`h-14 w-14 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 ${getIconStyles(
            item.type,
          )}`}
        >
          {getIcon(item.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base md:text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-on-surface-muted shrink-0">
              {item.time}
            </p>
          </div>

          <p className="mt-2 text-sm md:text-xs leading-6 text-on-surface-variant">
            {item.description}
          </p>
        </div>
      </div>

      {variant === "page" && item.type === "system" ? (
        <button className="mt-4 inline-flex items-center gap-2 text-label text-primary-light">
          Sprawdź teraz
          <ExternalLink size={14} />
        </button>
      ) : null}
    </div>
  );
}
