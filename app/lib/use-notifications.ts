"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage, isAbortError } from "./backend";
import { getNotifications, getNotificationCategories, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead, NOTIFICATIONS_CHANGED_EVENT, type AppNotification, type NotificationCategory, type UnreadCountResponse } from "./notifications";

export function useNotifications(open = true, initialCategory = "", initialRead = "", panel = false) {
  const [category, setCategory] = useState(initialCategory);
  const [readFilter, setReadFilter] = useState(initialRead === "true" || initialRead === "false" ? initialRead : "");
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
  view.current = `${open}:${category}:${readFilter}`;
  useEffect(() => () => { view.current = "unmounted"; }, []);
  const loadNotifications = useCallback(() => {
    setRevision(value => value + 1);
    if (categoryFailed.current) setCategoryAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, loadNotifications);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadNotifications);
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
        const [items, count] = await Promise.all([
          getNotifications({ category: category || undefined, isRead: readFilter === "" ? undefined : readFilter === "true" }, controller.signal),
          getUnreadNotificationCount(undefined, controller.signal),
        ]);
        if (!active) return;
        setNotifications(items);
        setCounts(count);
      } catch (error) {
        if (active && !isAbortError(error)) setError(getErrorMessage(error, "Nie udało się pobrać powiadomień."));
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; controller.abort(); };
  }, [open, category, readFilter, revision]);

  function handleMarkAsRead(id: number): Promise<boolean> {
    const existing = pending.current.get(id);
    if (existing) return existing;
    if (notifications.find(item => item.id === id)?.isRead) return Promise.resolve(true);
    const previous = notifications.find(item => item.id === id);
    const currentView = view.current;
    setMarkingIds(ids => [...ids, id]);
    setNotifications(items => items.map(item => item.id === id ? { ...item, isRead: true } : item));
    const operation = markNotificationAsRead(id).then(() => {
      return true;
    }).catch(error => {
      if (previous && currentView === view.current) setNotifications(items => items.map(item => item.id === id ? previous : item));
      if (currentView === view.current && !isAbortError(error)) toast.error(getErrorMessage(error, "Nie udało się oznaczyć powiadomienia."));
      return false;
    }).finally(() => {
      pending.current.delete(id);
      setMarkingIds(ids => ids.filter(value => value !== id));
      // Successful writes publish one global refresh event.
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
  return { category, setCategory, readFilter, setReadFilter, categories, notifications, counts, unreadCount, loading, error: error || categoryError, markingIds, markingAll, handleMarkAsRead, handleMarkAllAsRead, loadNotifications };
}
