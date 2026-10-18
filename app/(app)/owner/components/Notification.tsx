"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  MailPlus,
  Package,
  UserPlus,
  Users,
} from "lucide-react";
import {
  getNotificationDestination,
  normalizeNotificationRole,
  rememberNotificationPreview,
  type AppNotification,
  type NotificationRole,
} from "@/app/lib/notifications";
import { formatNotificationTime, notificationCategoryLabel } from "./notification-display";
import { resolvePaymentNotificationTarget } from "@/app/lib/payment-notification-target";

export { formatNotificationTime } from "./notification-display";

// Navigation never waits longer than this for the "read" request.
const MARK_BEFORE_NAVIGATION_MS = 800;

function getIcon(item: AppNotification) {
  switch (item.category) {
    case "payments": return <CreditCard size={17} />;
    case "packages": return <Package size={17} />;
    case "schedule": return <CalendarDays size={17} />;
    case "invitations": return <MailPlus size={17} />;
    case "trainers": return <Building2 size={17} />;
    case "group_classes": return <Users size={17} />;
    case "registrations": return <UserPlus size={17} />;
    default: return <BellRing size={17} />;
  }
}

function getIconStyles(item: AppNotification) {
  switch (item.severity?.toLowerCase()) {
    case "critical":
    case "error":
      return "bg-error-container/60 text-error-light";
    case "warning":
      return "bg-warning-container/60 text-warning-light";
    case "success":
      return "bg-tertiary-container/60 text-tertiary-light";
    default:
      return "bg-primary/15 text-primary-light";
  }
}

export default function NotificationItem({
  item, variant = "page", markingAsRead = false, role, now,
  onNavigate, onMarkAsRead, expanded = false, onToggle,
}: {
  item: AppNotification;
  variant?: "page" | "panel";
  markingAsRead?: boolean;
  role: NotificationRole;
  now?: number;
  onNavigate?: () => void;
  onMarkAsRead?: (id: number) => Promise<boolean | void>;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const compact = variant === "panel";
  const pathname = usePathname();
  const notificationRole = normalizeNotificationRole(role) ?? normalizeNotificationRole(pathname.split("/")[1]);
  const destination = getNotificationDestination(item, notificationRole);
  // In the popup a notification without its own destination opens its full text on the notifications page.
  const href = destination ?? (compact && notificationRole ? `/${notificationRole}/notifications?notificationId=${item.id}` : null);
  const router = useRouter();
  const activating = useRef(false);
  const read = useRef(item.isRead);
  const element = useRef<HTMLElement>(null);
  const category = notificationCategoryLabel(item.category);
  const unread = !item.isRead;
  useEffect(() => {
    if (expanded) element.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [expanded]);

  async function markAsRead() {
    if (!onMarkAsRead || (!markingAsRead && (item.isRead || read.current))) return true;
    try {
      const success = await onMarkAsRead(item.id);
      if (success === false) return false;
      read.current = true;
      return true;
    } catch {
      return false;
    }
  }

  async function navigate() {
    if (!href || activating.current) return;
    activating.current = true;
    // A failed or slow "read" request must not block the user.
    await Promise.race([markAsRead(), new Promise(resolve => setTimeout(resolve, MARK_BEFORE_NAVIGATION_MS))]);
    if (!destination) rememberNotificationPreview(item);
    const target = destination ? await resolvePaymentNotificationTarget(item, notificationRole, href) ?? href : href;
    onNavigate?.();
    router.push(target);
  }

  function activate() {
    if (compact) {
      void navigate();
      return;
    }
    onToggle?.();
    void markAsRead();
  }

  const time = formatNotificationTime(item.createdAt, now);

  return (
    <article
      ref={element}
      id={`notification-${item.id}`}
      className={[
        "group relative min-w-0 scroll-mt-6 overflow-hidden rounded-[var(--radius-lg)] transition-colors",
        unread ? "bg-primary/[0.07]" : compact ? "bg-transparent" : "bg-surface-container-low/60",
        expanded ? "ring-1 ring-primary-light/25" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={activate}
        aria-busy={markingAsRead}
        aria-expanded={compact ? undefined : expanded}
        aria-controls={compact ? undefined : `notification-details-${item.id}`}
        className={`flex w-full min-w-0 items-start gap-3 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-light ${compact ? "py-2.5 pl-3" : "py-3 pl-3 md:pl-4"} ${unread && onMarkAsRead ? "pr-12" : compact ? "pr-3" : "pr-3 md:pr-4"}`}
      >
        {unread ? <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-0.5 rounded-r-full bg-primary-light" /> : null}
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${getIconStyles(item)}`}>{getIcon(item)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline justify-between gap-3">
            <span className={`min-w-0 break-words text-sm leading-5 line-clamp-2 ${unread ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant"}`}>
              {item.title || "Powiadomienie"}
            </span>
            <time dateTime={item.createdAt} className="shrink-0 text-[11px] tabular-nums text-on-surface-muted">{time}</time>
          </span>
          {!expanded && item.message ? (
            <span className={`mt-0.5 block break-words text-xs leading-5 text-on-surface-muted ${compact ? "line-clamp-2" : "line-clamp-1 md:line-clamp-2"}`}>{item.message}</span>
          ) : null}
          {category || (!compact && !expanded) ? (
            <span className="mt-1.5 flex items-center gap-2 text-[11px] text-on-surface-muted">
              {category ? <span className="rounded-full bg-surface-container px-2 py-0.5 font-medium">{category}</span> : null}
              {!compact ? <ChevronDown size={13} className={`ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /> : null}
            </span>
          ) : null}
        </span>
        {unread ? <span className="sr-only">Nieprzeczytane</span> : null}
      </button>

      {unread && onMarkAsRead ? (
        <button
          type="button"
          disabled={markingAsRead}
          onClick={() => void markAsRead()}
          aria-label="Oznacz jako przeczytane"
          title="Oznacz jako przeczytane"
          className="absolute right-2 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light focus-visible:outline-2 focus-visible:outline-primary-light disabled:opacity-40"
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary-light transition group-hover:hidden group-focus-within:hidden" />
          <Check size={15} aria-hidden="true" className="hidden group-hover:block group-focus-within:block" />
        </button>
      ) : null}

      {!compact ? (
        <div id={`notification-details-${item.id}`} hidden={!expanded} className="px-3 pb-4 md:px-4 md:pl-16">
          {item.message ? <p className="whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{item.message}</p> : null}
          {href ? (
            <button
              type="button"
              onClick={() => void navigate()}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary/15 px-4 text-sm font-semibold text-primary-light transition hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-primary-light sm:w-auto"
            >
              Przejdź do szczegółów <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
