"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ChevronDown,
  CircleUserRound,
  CreditCard,
  ExternalLink,
  FileSignature,
  MailPlus,
  MapPin,
  ReceiptText,
} from "lucide-react";
import {
  getNotificationDestination,
  rememberNotificationPreview,
  getNotificationKind,
  type NotificationRole,
  type AppNotification,
} from "@/app/lib/notifications";

function getIcon(item: AppNotification) {
  switch (getNotificationKind(item)) {
    case "payment":
    case "subscription":
      return <CreditCard size={18} />;
    case "session":
      return <CalendarDays size={18} />;
    case "invitation":
      return <MailPlus size={18} />;
    case "contract":
      return <FileSignature size={18} />;
    case "settlement":
    case "expense":
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
  switch (item.severity?.toLowerCase()) {
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
  item, variant = "page", markingAsRead = false, role,
  onNavigate, onMarkAsRead, notificationsHref, expanded = false, onToggle,
}: {
  item: AppNotification;
  variant?: "page" | "panel";
  markingAsRead?: boolean;
  role: NotificationRole;
  onNavigate?: () => void;
  onMarkAsRead?: (id: number) => Promise<boolean | void>;
  notificationsHref?: string;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const compact = variant === "panel";
  const href = getNotificationDestination(item, role);
  const router = useRouter();
  const activating = useRef(false);
  const element = useRef<HTMLElement>(null);
  useEffect(() => {
    if (expanded) element.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [expanded]);

  async function navigate(destination: string) {
    if (activating.current) return;
    activating.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (compact) rememberNotificationPreview(item);
      if (!item.isRead && onMarkAsRead) {
        await Promise.race([
          onMarkAsRead(item.id).then(success => {
            if (compact && success !== false) rememberNotificationPreview({ ...item, isRead: true });
          }),
          new Promise<void>(resolve => { timer = setTimeout(resolve, 1200); }),
        ]).catch(() => {});
      }
      onNavigate?.();
      router.push(destination);
    } finally {
      clearTimeout(timer);
      activating.current = false;
    }
  }
  function activate() {
    if (compact) {
      void navigate(`${notificationsHref ?? `/${role}/notifications`}?notificationId=${item.id}`);
    } else {
      onToggle?.();
      if (!item.isRead && onMarkAsRead) void onMarkAsRead(item.id);
    }
  }

  return (
    <article ref={element} id={`notification-${item.id}`} className={`min-w-0 scroll-mt-6 overflow-hidden rounded-[var(--radius-lg)] transition ${item.isRead ? "bg-surface-container" : "bg-primary/10"} ${expanded ? "ring-1 ring-primary-light/30" : ""}`}>
      <button type="button" onClick={activate} aria-expanded={compact ? undefined : expanded} aria-controls={compact ? undefined : `notification-details-${item.id}`} className="relative flex w-full min-w-0 items-start gap-3 p-3 text-left transition hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-light">
        {!item.isRead && <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full bg-primary-light" />}
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${getIconStyles(item)}`}>{getIcon(item)}</span>
        <span className="min-w-0 flex-1">
          <span className={`line-clamp-2 break-words text-sm leading-5 ${item.isRead ? "font-medium text-on-surface-variant" : "font-semibold text-on-surface"}`}>{item.title}</span>
          {!expanded && <span className={`mt-0.5 break-words text-xs leading-5 text-on-surface-muted ${compact ? "line-clamp-1" : "line-clamp-2"}`}>{item.message}</span>}
          <time dateTime={item.createdAt} className="mt-1 block text-[0.68rem] text-on-surface-muted">{formatNotificationTime(item.createdAt)}</time>
        </span>
        <span className="flex shrink-0 flex-col items-center gap-2 pt-1 text-on-surface-muted">
          {!item.isRead && <span aria-label="Nieprzeczytane" className="h-1.5 w-1.5 rounded-full bg-primary-light" />}
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>
      {!compact && <div id={`notification-details-${item.id}`} hidden={!expanded} className="px-4 pb-4 sm:pl-14">
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{item.message}</p>
        <p className="mt-3 text-xs text-on-surface-muted">{item.isRead ? "Przeczytane" : "Nieprzeczytane"}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {href && <button type="button" onClick={() => void navigate(href)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary/15 px-3 py-2 text-sm font-semibold text-primary-light transition hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-primary-light sm:w-auto">
            Przejdź do szczegółów <ExternalLink size={14} />
          </button>}
          {!item.isRead && onMarkAsRead && <button type="button" disabled={markingAsRead} onClick={() => void onMarkAsRead(item.id)} className="inline-flex min-h-10 items-center gap-1.5 text-xs text-on-surface-muted hover:text-on-surface disabled:opacity-50"><Check size={13} />{markingAsRead ? "Oznaczanie…" : "Oznacz jako przeczytane"}</button>}
        </div>
      </div>}
    </article>
  );
}
