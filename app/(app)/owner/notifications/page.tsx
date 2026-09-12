"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BellOff, CheckCheck, LoaderCircle, RefreshCw } from "lucide-react";
import NotificationItem from "../components/Notification";
import { Button } from "@/app/components/ui/button";
import { findNotificationInList, getNotificationPreview, type AppNotification, type NotificationRole } from "@/app/lib/notifications";
import { getErrorMessage } from "@/app/lib/backend";
import { useNotifications } from "@/app/lib/use-notifications";
import NotificationFilters, { markAllLabel } from "../components/NotificationFilters";

export default function NotificationsPage() {
  return <Suspense fallback={<p role="status">Pobieranie powiadomień…</p>}><NotificationsContent /></Suspense>;
}

function NotificationsContent() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("notificationId"));
  return <NotificationsList key={searchParams.toString()} notificationId={Number.isSafeInteger(id) && id > 0 ? id : null} initialCategory={searchParams.get("category") ?? ""} initialRead={searchParams.get("isRead") ?? ""} />;
}

function NotificationsList({ initialCategory, initialRead, notificationId }: { initialCategory: string; initialRead: string; notificationId: number | null }) {
  const pathname = usePathname();
  const role: NotificationRole = pathname.startsWith("/trainer")
    ? "trainer"
    : pathname.startsWith("/client")
      ? "client"
      : "owner";
  const state = useNotifications(true, initialCategory, initialRead);
  const { notifications, loading, error, markingIds, markingAll, unreadCount, handleMarkAsRead, handleMarkAllAsRead, loadNotifications } = state;
  const [expandedId, setExpandedId] = useState<number | null>(notificationId);
  const [retained, setRetained] = useState<AppNotification | null>(() => notificationId ? getNotificationPreview(notificationId) : null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const selected = notifications.find(item => item.id === expandedId) ?? (retained?.id === expandedId ? retained : null);
  const items = selected && !notifications.some(item => item.id === selected.id) ? [selected, ...notifications] : notifications;
  function toggle(item: AppNotification) {
    setExpandedId(expandedId === item.id ? null : item.id);
    setRetained(item);
  }
  useEffect(() => {
    if (loading || !expandedId || selected) return;
    let active = true;
    findNotificationInList(expandedId, () => active).then(item => {
      if (!active) return;
      setRetained(item);
      setLookupError(item ? null : "Nie znaleziono wybranego powiadomienia w dostępnej historii.");
    }).catch(error => {
      if (active) setLookupError(getErrorMessage(error, "Nie udało się pobrać wybranego powiadomienia."));
    });
    return () => { active = false; };
  }, [loading, expandedId, selected]);

  function resetSelection() {
    setExpandedId(null);
    setRetained(null);
    setLookupError(null);
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
            onClick={async () => {
              const success = await handleMarkAllAsRead();
              if (success) setRetained(current => current && (!state.category || current.category === state.category) ? { ...current, isRead: true } : current);
            }}
            className="h-auto min-h-10 max-w-full whitespace-normal bg-primary/15 py-2 text-primary-light hover:bg-primary/25 sm:max-w-[50%]"
          >
            {markingAll ? "Oznaczanie…" : markAllLabel(state.category, state.categories)}
          </Button>
        </div>

        <NotificationFilters {...state}
          setCategory={value => { resetSelection(); state.setCategory(value); }}
          setReadFilter={value => { resetSelection(); state.setReadFilter(value); }}
        />

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

        {!loading && expandedId && !selected && <p role="status" className="mt-4 text-sm text-on-surface-muted">{lookupError ?? "Pobieranie wybranego powiadomienia…"}</p>}
        {loading && <p role="status" className="py-2 text-xs text-on-surface-muted">Odświeżanie…</p>}
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-on-surface-muted">
            <LoaderCircle size={18} className="animate-spin" />
            Pobieranie powiadomień…
          </div>
        ) : items.length === 0 ? (
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
          <div className="mt-5 flex flex-col gap-2">
            {items.map(item => (
              <NotificationItem key={item.id} item={item} role={role}
                expanded={expandedId === item.id} onToggle={() => toggle(item)}
                markingAsRead={markingIds.includes(item.id)}
                onMarkAsRead={async id => {
                  const success = await handleMarkAsRead(id);
                  if (success) setRetained(current => current?.id === id ? { ...current, isRead: true } : current);
                  return success;
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
