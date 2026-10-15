"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage, isAbortError } from "./backend";
import { getNotificationsPage, getNotifications, getNotificationCategories, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead, NOTIFICATIONS_CHANGED_EVENT, type AppNotification, type NotificationCategory, type NotificationsChange, type UnreadCountResponse } from "./notifications";

const PANEL_LIMIT = 20;

// Mark the given items read and lower the unread counters for those that were unread here.
function applyRead(items: AppNotification[], counts: UnreadCountResponse, ids: number[]) {
  let total = counts.unreadCount;
  const byCategory = { ...counts.unreadByCategory };
  const next = items.map((item) => {
    if (!ids.includes(item.id) || item.isRead) return item;
    total -= 1;
    if (item.category && byCategory[item.category]) byCategory[item.category] -= 1;
    return { ...item, isRead: true };
  });
  // Items read elsewhere and not loaded in this view only lower the total.
  const unseen = ids.filter((id) => !items.some((item) => item.id === id)).length;
  return { items: next, counts: { unreadCount: Math.max(0, total - unseen), unreadByCategory: byCategory } };
}

function applyReadAll(items: AppNotification[], counts: UnreadCountResponse, category?: string) {
  const next = items.map((item) => (!category || item.category === category) && !item.isRead ? { ...item, isRead: true } : item);
  if (!category) return { items: next, counts: { unreadCount: 0, unreadByCategory: {} } };
  const removed = counts.unreadByCategory[category] ?? 0;
  return { items: next, counts: { unreadCount: Math.max(0, counts.unreadCount - removed), unreadByCategory: { ...counts.unreadByCategory, [category]: 0 } } };
}

export function useNotifications(open = true, initialCategory = "", initialRead = "", panel = false) {
  const [category, setCategory] = useState(initialCategory);
  const [readFilter, setReadFilter] = useState(initialRead === "true" || initialRead === "false" ? initialRead : "");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;
  const requestKey = `${open}:${panel}:${category}:${readFilter}:${page}`;
  const [loadedKey, setLoadedKey] = useState("");
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [counts, setCounts] = useState<UnreadCountResponse>({ unreadCount: 0, unreadByCategory: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<number[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const pending = useRef(new Map<number, Promise<boolean>>());
  const allPending = useRef(false);
  const [revision, setRevision] = useState(0);
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const categoryFailed = useRef(false);
  const view = useRef("");
  const latest = useRef({ notifications, counts });
  useEffect(() => { latest.current = { notifications, counts }; }, [notifications, counts]);
  useEffect(() => { view.current = `${open}:${category}:${readFilter}`; }, [open, category, readFilter]);
  useEffect(() => () => { view.current = "unmounted"; }, []);
  const loadNotifications = useCallback(() => {
    setRevision(value => value + 1);
    if (categoryFailed.current) setCategoryAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleChange(event: Event) {
      const change = (event as CustomEvent<NotificationsChange | undefined>).detail;
      const { notifications: items, counts: current } = latest.current;
      if (change?.readIds?.length) {
        const next = applyRead(items, current, change.readIds);
        setNotifications(next.items); setCounts(next.counts);
      } else if (change?.readAll) {
        const next = applyReadAll(items, current, change.readAll.category);
        setNotifications(next.items); setCounts(next.counts);
      } else {
        loadNotifications();
      }
    }
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open || panel) return;
    let active = true;
    const controller = new AbortController();
    getNotificationCategories(controller.signal).then(data => {
      if (active) { categoryFailed.current = false; setCategories(data); setCategoryError(null); }
    }).catch(error => {
      if (active && !isAbortError(error)) { categoryFailed.current = true; setCategoryError(getErrorMessage(error, "Nie udało się pobrać kategorii.")); }
    });
    return () => { active = false; controller.abort(); };
  }, [open, categoryAttempt, panel]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    // Start in a microtask so cleanup also invalidates requests before they start.
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError(null);
      try {
        const isRead = readFilter === "" ? undefined : readFilter === "true";
        const [items, count] = await Promise.all([
          panel
            ? getNotifications({ limit: PANEL_LIMIT, category: category || undefined, isRead }, controller.signal).then(items => ({ items, totalCount: items.length, totalPages: 1 }))
            : getNotificationsPage({ page, pageSize, category: category || undefined, isRead }, controller.signal),
          getUnreadNotificationCount(undefined, controller.signal),
        ]);
        if (!active) return;
        if (!panel && page > Math.max(1, items.totalPages)) { setPage(Math.max(1, items.totalPages)); return; }
        setNotifications(items.items || []); setTotalCount(items.totalCount); setLoadedKey(requestKey);
        setCounts(count);
      } catch (error) {
        if (active && !isAbortError(error)) { setError(getErrorMessage(error, "Nie udało się pobrać powiadomień.")); setLoadedKey(requestKey); setNotifications([]); }
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; controller.abort(); };
  }, [open, category, readFilter, revision, page, panel, requestKey]);

  function handleMarkAsRead(id: number): Promise<boolean> {
    const existing = pending.current.get(id);
    if (existing) return existing;
    const previous = notifications.find(item => item.id === id);
    if (previous?.isRead) return Promise.resolve(true);
    const previousCounts = counts;
    const currentView = view.current;
    setMarkingIds(ids => [...ids, id]);
    const optimistic = applyRead(notifications, counts, [id]);
    setNotifications(optimistic.items); setCounts(optimistic.counts);
    const operation = markNotificationAsRead(id).then(() => true).catch(error => {
      if (previous && currentView === view.current) {
        setNotifications(items => items.map(item => item.id === id ? previous : item));
        setCounts(previousCounts);
      }
      if (currentView === view.current && !isAbortError(error)) toast.error(getErrorMessage(error, "Nie udało się oznaczyć powiadomienia."));
      return false;
    }).finally(() => {
      pending.current.delete(id);
      setMarkingIds(ids => ids.filter(value => value !== id));
    });
    pending.current.set(id, operation);
    return operation;
  }

  const unreadCount = category ? counts.unreadByCategory[category] ?? 0 : counts.unreadCount;
  async function handleMarkAllAsRead() {
    if (allPending.current || unreadCount === 0) return false;
    const currentView = view.current;
    allPending.current = true;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead(category || undefined);
      return true;
    }
    catch (error) {
      if (currentView === view.current && !isAbortError(error)) toast.error(getErrorMessage(error, "Nie udało się oznaczyć powiadomień."));
      return false;
    }
    finally { allPending.current = false; setMarkingAll(false); }
  }
  return { page, pageSize, totalCount, setPage, category, setCategory: (value: string) => { setCategory(value); setPage(1); }, readFilter, setReadFilter: (value: string) => { setReadFilter(value); setPage(1); }, categories, notifications: loadedKey === requestKey ? notifications : [], counts, unreadCount, loading: loading || loadedKey !== requestKey, error: error || categoryError, markingIds, markingAll, handleMarkAsRead, handleMarkAllAsRead, loadNotifications };
}

// Re-renders relative times ("5 min temu") once a minute while mounted.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
