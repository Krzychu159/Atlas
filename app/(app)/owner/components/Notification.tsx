"use client";

import Link from "next/link";
import {
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CircleUserRound,
  CreditCard,
  ExternalLink,
  FileSignature,
  MailPlus,
  MapPin,
  ReceiptText,
} from "lucide-react";
import {
  getSafeNotificationUrl,
  type AppNotification,
} from "@/app/lib/notifications";

function getNotificationKind(item: AppNotification) {
  const kind = (item.relatedEntityType || item.type).toLowerCase();

  if (kind.includes("payment")) return "payment";
  if (kind.includes("session")) return "session";
  if (kind.includes("invitation")) return "invitation";
  if (kind.includes("contract")) return "contract";
  if (kind.includes("settlement")) return "settlement";
  if (kind.includes("client")) return "client";
  if (kind.includes("trainer")) return "trainer";
  if (kind.includes("location")) return "location";
  return "system";
}

function getIcon(item: AppNotification) {
  switch (getNotificationKind(item)) {
    case "payment":
      return <CreditCard size={18} />;
    case "session":
      return <CalendarDays size={18} />;
    case "invitation":
      return <MailPlus size={18} />;
    case "contract":
      return <FileSignature size={18} />;
    case "settlement":
      return <ReceiptText size={18} />;
    case "client":
      return <CircleUserRound size={18} />;
    case "trainer":
      return <Building2 size={18} />;
    case "location":
      return <MapPin size={18} />;
    default:
      return <BellRing size={18} />;
  }
}

function getIconStyles(item: AppNotification) {
  switch (item.severity.toLowerCase()) {
    case "error":
      return "bg-error-container text-error-light";
    case "warning":
      return "bg-warning-container text-warning-light";
    case "success":
      return "bg-tertiary-container text-tertiary-light";
    default:
      return "bg-primary/20 text-primary-light";
  }
}

export function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) return "";

  const elapsedMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (elapsedMinutes >= 0 && elapsedMinutes < 1) return "Teraz";
  if (elapsedMinutes >= 0 && elapsedMinutes < 60) {
    return `${elapsedMinutes} min temu`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours >= 0 && elapsedHours < 24) {
    return `${elapsedHours} godz. temu`;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function NotificationItem({
  item,
  variant = "page",
  markingAsRead = false,
  onMarkAsRead,
}: {
  item: AppNotification;
  variant?: "page" | "panel";
  markingAsRead?: boolean;
  onMarkAsRead?: (id: number) => void;
}) {
  const href = getSafeNotificationUrl(item.actionUrl);
  const compact = variant === "panel";

  return (
    <article
      className={`relative rounded-[var(--radius-lg)] border transition ${
        compact ? "p-3.5" : "p-4"
      } ${
        item.isRead
          ? "border-transparent bg-surface-container"
          : "border-primary-light/20 bg-primary/[0.055]"
      }`}
    >
      {!item.isRead ? (
        <span className="absolute bottom-3.5 left-0 top-3.5 w-0.5 rounded-r-full bg-primary-light" />
      ) : null}

      <div className="flex items-start gap-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
            compact ? "h-9 w-9" : "h-10 w-10"
          } ${getIconStyles(item)}`}
        >
          {getIcon(item)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold leading-5 text-on-surface">
              {item.title}
            </p>
            <time
              dateTime={item.createdAt}
              className="shrink-0 text-[0.68rem] leading-5 text-on-surface-muted"
            >
              {formatNotificationTime(item.createdAt)}
            </time>
          </div>

          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {item.message}
          </p>

          {href || !item.isRead ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {href ? (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-light transition hover:text-on-surface"
                >
                  Przejdź do szczegółów
                  <ExternalLink size={12} />
                </Link>
              ) : null}

              {!item.isRead && onMarkAsRead ? (
                <button
                  type="button"
                  disabled={markingAsRead}
                  onClick={() => onMarkAsRead(item.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-muted transition hover:text-on-surface disabled:cursor-wait disabled:opacity-50"
                >
                  <Check size={13} />
                  {markingAsRead ? "Oznaczanie…" : "Oznacz jako przeczytane"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
