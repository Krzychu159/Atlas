"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellOff, CheckCheck, ExternalLink, LoaderCircle, X } from "lucide-react";
import NotificationItem from "./Notification";
import { Button } from "@/app/components/ui/button";
import { getErrorMessage } from "@/app/lib/backend";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from "@/app/lib/notifications";

export default function NotificationsPanel({
  open,
  onClose,
  notificationsHref,
  totalUnreadCount,
  onUnreadCountChange,
}: {
  open: boolean;
  onClose: () => void;
  notificationsHref: string;
  totalUnreadCount: number;
  onUnreadCountChange?: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<number[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    getNotifications(20)
      .then((data) => {
        if (!active) return;
        setError(null);
        setNotifications(data);
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(
            getErrorMessage(fetchError, "Nie udało się pobrać powiadomień."),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, onUnreadCountChange]);

  const unreadCount = totalUnreadCount;

  async function handleMarkAsRead(id: number) {
    if (markingIds.includes(id)) return;

    setMarkingIds((current) => [...current, id]);
    setError(null);

    try {
      await markNotificationAsRead(id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    } catch (markError) {
      setError(
        getErrorMessage(markError, "Nie udało się oznaczyć powiadomienia."),
      );
    } finally {
      setMarkingIds((current) => current.filter((itemId) => itemId !== id));
    }
  }

  async function handleMarkAllAsRead() {
    if (markingAll || unreadCount === 0) return;

    setMarkingAll(true);
    setError(null);

    try {
      await markAllNotificationsAsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true, readAt })),
      );
      onUnreadCountChange?.(0);
    } catch (markError) {
      setError(
        getErrorMessage(markError, "Nie udało się oznaczyć powiadomień."),
      );
    } finally {
      setMarkingAll(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 hidden md:block">
      <button
        aria-label="Zamknij powiadomienia"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
      />

      <aside className="absolute bottom-5 right-5 top-5 flex w-[410px] flex-col overflow-hidden rounded-[28px] bg-surface-container-low shadow-ambient">
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
            className="w-full bg-primary/15 text-primary-light hover:bg-primary/25"
          >
            {markingAll ? "Oznaczanie…" : "Oznacz wszystkie jako przeczytane"}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-24">
          {error ? (
            <div className="mb-3 rounded-[var(--radius-lg)] bg-error-container/45 px-4 py-3 text-xs leading-5 text-error-light">
              {error}
            </div>
          ) : null}

          {loading ? (
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
                  variant="panel"
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
