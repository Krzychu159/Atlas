"use client";

import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";
import { ArrowRight, BellOff, CheckCheck, LoaderCircle, RefreshCw } from "lucide-react";
import NotificationItem from "./Notification";
import { groupNotificationsByDay } from "./notification-display";
import { type NotificationRole } from "@/app/lib/notifications";
import { useNotifications, useNow } from "@/app/lib/use-notifications";

export default function NotificationsPanel({
  open,
  onClose,
  notificationsHref,
  onUnreadCountChange,
  role,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  notificationsHref: string;
  onUnreadCountChange?: (count: number) => void;
  role: NotificationRole;
  // The bell and the popup live inside this element; clicks outside it close the popup.
  anchorRef?: RefObject<HTMLElement | null>;
}) {
  const state = useNotifications(open, "", "", true);
  const { notifications, loading, error, markingIds, markingAll, handleMarkAsRead, handleMarkAllAsRead, readFilter, setReadFilter, counts } = state;
  const panelRef = useRef<HTMLDivElement>(null);
  const now = useNow();
  const totalUnread = counts.unreadCount;

  useEffect(() => {
    if (open && !loading && !error) onUnreadCountChange?.(totalUnread);
  }, [open, loading, error, totalUnread, onUnreadCountChange]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const anchor = anchorRef?.current;
    function handlePointerDown(event: PointerEvent) {
      const container = anchor ?? panelRef.current;
      if (container && !container.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onClose();
      anchor?.querySelector<HTMLButtonElement>("button[aria-haspopup]")?.focus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const groups = groupNotificationsByDay(notifications, now);
  const unreadTab = readFilter === "false";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Powiadomienia"
      tabIndex={-1}
      className="absolute right-0 top-[calc(100%+0.625rem)] z-50 flex max-h-[min(38rem,calc(100dvh-6rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-high shadow-ambient outline-none ring-1 ring-white/5"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight">Powiadomienia</p>
          <p className="mt-0.5 text-xs text-on-surface-muted">
            {totalUnread > 0 ? `Nieprzeczytane: ${totalUnread}` : "Wszystko przeczytane"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleMarkAllAsRead()}
          disabled={markingAll || totalUnread === 0 || loading}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-primary-light transition hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary-light disabled:cursor-not-allowed disabled:text-on-surface-muted disabled:hover:bg-transparent"
        >
          {markingAll ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <CheckCheck size={14} aria-hidden="true" />}
          Oznacz wszystkie
        </button>
      </div>

      <div role="tablist" aria-label="Pokaż" className="mx-4 mb-2 grid grid-cols-2 gap-1 rounded-full bg-surface-container-low p-1">
        {[["", "Wszystkie"], ["false", "Nieprzeczytane"]].map(([value, label]) => {
          const active = readFilter === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setReadFilter(value)}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-primary-light ${active ? "bg-primary/20 text-on-surface" :"text-on-surface-variant hover:text-on-surface"}`}
            >
              {label}
              {value === "false" && totalUnread > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 text-on-primary">{totalUnread > 99 ? "99+" : totalUnread}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-surface-container-low) transparent" }} aria-busy={loading}>
        {error ? (
          <div role="alert" className="mx-2 my-3 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-error-container/30 px-3 py-2.5 text-xs text-error-light">
            <span>Nie udało się pobrać powiadomień.</span>
            <button type="button" onClick={state.loadNotifications} className="inline-flex min-h-8 shrink-0 items-center gap-1.5 font-semibold">
              <RefreshCw size={13} aria-hidden="true" /> Ponów
            </button>
          </div>
        ) : loading && notifications.length === 0 ? (
          <div role="status" aria-label="Pobieranie powiadomień" className="flex flex-col gap-1 px-1 pt-1">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex animate-pulse items-start gap-3 rounded-[var(--radius-lg)] px-3 py-2.5">
                <span className="h-9 w-9 shrink-0 rounded-[var(--radius-md)] bg-surface-container" />
                <span className="flex-1 space-y-2 pt-1">
                  <span className="block h-3 w-3/4 rounded-full bg-surface-container" />
                  <span className="block h-2.5 w-full rounded-full bg-surface-container/70" />
                </span>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-muted">
              {unreadTab ? <CheckCheck size={20} /> : <BellOff size={20} />}
            </span>
            <p className="mt-3 text-sm font-semibold">{unreadTab ? "Wszystko przeczytane" : "Brak powiadomień"}</p>
            <p className="mt-1 text-xs leading-5 text-on-surface-muted">
              {unreadTab ? "Nie masz nowych powiadomień." : "Nowe powiadomienia pojawią się tutaj."}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="pt-1">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    role={role}
                    now={now}
                    variant="panel"
                    onNavigate={onClose}
                    markingAsRead={markingIds.includes(item.id)}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Link
        href={notificationsHref}
        onClick={onClose}
        className="flex h-12 shrink-0 items-center justify-center gap-2 bg-surface-container text-sm font-semibold text-on-surface-variant transition hover:bg-surface-bright hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-light"
      >
        Zobacz wszystkie powiadomienia
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}
