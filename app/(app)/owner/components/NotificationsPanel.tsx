"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BellOff, CheckCheck, ExternalLink, LoaderCircle, X } from "lucide-react";
import NotificationItem from "./Notification";
import { Button } from "@/app/components/ui/button";
import { type NotificationRole } from "@/app/lib/notifications";
import { useNotifications } from "@/app/lib/use-notifications";


export default function NotificationsPanel({
  open,
  onClose,
  notificationsHref,
  onUnreadCountChange,
  role,
}: {
  open: boolean;
  onClose: () => void;
  notificationsHref: string;
  totalUnreadCount: number;
  onUnreadCountChange?: (count: number) => void;
  role: NotificationRole;
}) {
  const state = useNotifications(open, "", "", true);
  const { notifications, loading, error, markingIds, markingAll, unreadCount, handleMarkAsRead, handleMarkAllAsRead } = state;
  useEffect(() => {
    if (open && !loading && !error) onUnreadCountChange?.(state.counts.unreadCount);
  }, [open, loading, error, state.counts.unreadCount, onUnreadCountChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Zamknij powiadomienia"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
      />

      <aside className="absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[460px] md:bottom-5 md:right-5 md:top-5 flex-col overflow-hidden rounded-[28px] bg-surface-container-low shadow-ambient">
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
          <div>
            <p className="text-[1.35rem] font-semibold">Powiadomienia</p>
            <p className="mt-1 text-xs text-on-surface-muted">
              {unreadCount > 0
                ? `${unreadCount} nieprzeczytanych`
                : "Wszystko przeczytane"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"
              aria-label="Zamknij powiadomienia"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={
              markingAll ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <CheckCheck size={15} />
              )
            }
            disabled={markingAll || unreadCount === 0 || loading}
            onClick={handleMarkAllAsRead}
            className="h-auto min-h-10 w-full whitespace-normal bg-primary/15 py-2 text-primary-light hover:bg-primary/25"
          >
            {markingAll ? "Oznaczanie…" : "Oznacz wszystkie jako przeczytane"}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-24">
          {error ? (
            <div className="mb-3 rounded-[var(--radius-lg)] bg-error-container/45 px-4 py-3 text-xs leading-5 text-error-light">
              {error}
              <button type="button" onClick={state.loadNotifications} className="ml-2 min-h-10 font-semibold underline">Spróbuj ponownie</button>
            </div>
          ) : null}

          {loading && <p role="status" className="py-2 text-xs text-on-surface-muted">Odświeżanie…</p>}
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-on-surface-muted">
              <LoaderCircle size={17} className="animate-spin" />
              Pobieranie powiadomień…
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-muted">
                <BellOff size={20} />
              </div>
              <p className="mt-4 text-sm font-semibold">Brak powiadomień</p>
              <p className="mt-1 text-xs leading-5 text-on-surface-muted">
                Nowe alerty operacyjne pojawią się tutaj.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {notifications.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  role={role}
                  onNavigate={onClose}
                  variant="panel"
                  notificationsHref={notificationsHref}
                  markingAsRead={markingIds.includes(item.id)}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-container-low via-surface-container-low to-transparent p-5 pt-10">
          <Link
            href={notificationsHref}
            onClick={onClose}
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-high text-sm font-semibold transition hover:bg-surface-bright"
          >
            Zobacz wszystkie
            <ExternalLink size={15} />
          </Link>
        </div>
      </aside>
    </div>
  );
}
