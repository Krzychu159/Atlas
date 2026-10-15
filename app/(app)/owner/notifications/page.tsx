"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BellOff, CheckCheck, CircleAlert, LoaderCircle } from "lucide-react";
import NotificationItem from "../components/Notification";
import { groupNotificationsByDay, pluralizeNotifications } from "../components/notification-display";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
import { findNotificationInList, getNotificationPreview, type AppNotification, type NotificationRole } from "@/app/lib/notifications";
import { getErrorMessage } from "@/app/lib/backend";
import { useNotifications, useNow } from "@/app/lib/use-notifications";
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
  const now = useNow();
  const [expandedId, setExpandedId] = useState<number | null>(notificationId);
  const [retained, setRetained] = useState<AppNotification | null>(() => notificationId ? getNotificationPreview(notificationId) : null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const selected = notifications.find(item => item.id === expandedId) ?? (retained?.id === expandedId ? retained : null);
  const items = selected && !notifications.some(item => item.id === selected.id) ? [selected, ...notifications] : notifications;
  const filtered = Boolean(state.category || state.readFilter);

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

  function renderList() {
    if (error) {
      return (
        <ListState
          variant="error"
          icon={<CircleAlert size={28} />}
          title="Nie udało się pobrać powiadomień"
          message="Sprawdź połączenie i spróbuj ponownie."
          action={<Button variant="secondary" size="sm" onClick={() => void loadNotifications()}>Spróbuj ponownie</Button>}
        />
      );
    }
    if (loading && items.length === 0) return <ListState variant="loading" label="Pobieranie powiadomień..." />;
    if (items.length === 0) {
      return filtered ? (
        <ListState
          variant="empty"
          icon={<BellOff size={28} />}
          title="Brak powiadomień dla wybranych filtrów"
          message="Zmień kategorię lub stan przeczytania."
          action={<Button variant="secondary" size="sm" onClick={() => { resetSelection(); state.setCategory(""); state.setReadFilter(""); }}>Pokaż wszystkie</Button>}
        />
      ) : (
        <ListState
          variant="empty"
          icon={<BellOff size={28} />}
          title="Brak powiadomień"
          message="Kiedy pojawi się sprawa wymagająca Twojej uwagi, zobaczysz ją w tym miejscu."
        />
      );
    }

    return (
      <div className="bg-surface-container-lowest px-2 pb-3 md:px-3">
        {groupNotificationsByDay(items, now).map(group => (
          <section key={group.key} aria-label={group.label}>
            <p className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">{group.label}</p>
            <div className="flex flex-col gap-1.5">
              {group.items.map(item => (
                <NotificationItem key={item.id} item={item} role={role} now={now}
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
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label text-primary-light">Centrum powiadomień</p>
          <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-[0.95] tracking-tight md:text-[2.25rem]">Powiadomienia</h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Wiadomości o treningach, płatnościach i sprawach studia.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          icon={markingAll ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCheck size={16} />}
          disabled={markingAll || unreadCount === 0 || loading}
          onClick={async () => {
            const success = await handleMarkAllAsRead();
            if (success) setRetained(current => current && (!state.category || current.category === state.category) ? { ...current, isRead: true } : current);
          }}
          className="h-auto min-h-11 whitespace-normal py-2 sm:max-w-[50%]"
        >
          {markingAll ? "Oznaczanie…" : markAllLabel(state.category, state.categories)}
        </Button>
      </div>

      <NotificationFilters {...state}
        setCategory={value => { resetSelection(); state.setCategory(value); }}
        setReadFilter={value => { resetSelection(); state.setReadFilter(value); }}
      />

      {!loading && expandedId && !selected ? (
        <p role="status" className="text-sm text-on-surface-muted">{lookupError ?? "Pobieranie wybranego powiadomienia…"}</p>
      ) : null}

      <ListSection
        title="Historia powiadomień"
        meta={!loading && !error ? (unreadCount > 0 ? `${pluralizeNotifications(state.totalCount)} · nieprzeczytane: ${unreadCount}` : pluralizeNotifications(state.totalCount)) : null}
        busy={loading}
      >
        {renderList()}
        {!loading && !error && state.totalCount > state.pageSize ? (
          <PaymentPagination page={state.page} pageSize={state.pageSize} totalItems={state.totalCount} onPageChange={page => { resetSelection(); state.setPage(page); }} itemLabel="powiadomień" ariaLabel="Paginacja powiadomień" />
        ) : null}
      </ListSection>
    </div>
  );
}
