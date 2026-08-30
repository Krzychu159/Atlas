"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellOff, CheckCheck, LoaderCircle, RefreshCw } from "lucide-react";
import NotificationItem from "../components/Notification";
import { Button } from "@/app/components/ui/button";
import { getErrorMessage } from "@/app/lib/backend";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from "@/app/lib/notifications";

type NotificationSection = {
  title: string;
  items: AppNotification[];
};

function groupNotifications(items: AppNotification[]): NotificationSection[] {
  return [
    { title: "Nieprzeczytane", items: items.filter((item) => !item.isRead) },
    { title: "Wcześniejsze", items: items.filter((item) => item.isRead) },
  ].filter((group) => group.items.length > 0);
}

function Section({
  title,
  items,
  markingIds,
  onMarkAsRead,
}: {
  title: string;
  items: AppNotification[];
  markingIds: number[];
  onMarkAsRead: (id: number) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-4">
        <p className="text-label text-primary-light shrink-0">{title}</p>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <NotificationItem
            key={item.id}
            item={item}
            markingAsRead={markingIds.includes(item.id)}
            onMarkAsRead={onMarkAsRead}
          />
        ))}
      </div>
    </section>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<number[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [items, count] = await Promise.all([
        getNotifications(200),
        getUnreadNotificationCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count.unreadCount);
    } catch (fetchError) {
      setError(
        getErrorMessage(fetchError, "Nie udało się pobrać powiadomień."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([getNotifications(200), getUnreadNotificationCount()])
      .then(([data, count]) => {
        if (!active) return;
        setNotifications(data);
        setUnreadCount(count.unreadCount);
        setError(null);
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
  }, []);

  const sections = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  );
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
      setUnreadCount((current) => Math.max(0, current - 1));
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
      setUnreadCount(0);
    } catch (markError) {
      setError(
        getErrorMessage(markError, "Nie udało się oznaczyć powiadomień."),
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="px-1 pb-28">
        <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-page-title">Powiadomienia</p>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Systemowe i operacyjne alerty przypisane do Twojego konta.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={
              markingAll ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <CheckCheck size={16} />
              )
            }
            disabled={markingAll || unreadCount === 0 || loading}
            onClick={handleMarkAllAsRead}
            className="bg-primary/15 text-primary-light hover:bg-primary/25"
          >
            {markingAll
              ? "Oznaczanie…"
              : unreadCount > 0
                ? `Oznacz wszystkie jako przeczytane (${unreadCount})`
                : "Wszystko przeczytane"}
          </Button>
        </div>

        {error ? (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-error-container/45 px-4 py-3 text-sm text-error-light">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="inline-flex shrink-0 items-center gap-2 font-semibold"
            >
              <RefreshCw size={14} />
              Spróbuj ponownie
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-on-surface-muted">
            <LoaderCircle size={18} className="animate-spin" />
            Pobieranie powiadomień…
          </div>
        ) : sections.length === 0 ? (
          <div className="mt-12 flex flex-col items-center rounded-[var(--radius-xl)] bg-surface-container px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-muted">
              <BellOff size={22} />
            </div>
            <p className="mt-4 text-base font-semibold">Brak powiadomień</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-on-surface-muted">
              Kiedy pojawi się alert wymagający Twojej uwagi, zobaczysz go w tym
              miejscu.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {sections.map((section) => (
              <Section
                key={section.title}
                title={section.title}
                items={section.items}
                markingIds={markingIds}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
