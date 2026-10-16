"use client";

import { useEffect, useRef } from "react";

export type ListUrlParams = Record<string, string | null | undefined>;

export function readPositiveInt(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function readOption<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function listUrlKey(prefix: string, params: ListUrlParams) {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `${prefix}?${query}`;
}

/**
 * Mirrors list filters in the address so refresh, a copied link and "back" from a profile restore the view.
 * Only `managedKeys` are written; other parameters (e.g. `invitations`) are kept untouched.
 */
export function useListUrlSync(params: ListUrlParams, managedKeys: readonly string[], enabled = true) {
  const serialized = JSON.stringify(params);
  const keys = managedKeys.join(",");

  useEffect(() => {
    if (!enabled) return;
    const current = new URLSearchParams(window.location.search);
    const next = new URLSearchParams(current);
    const values = JSON.parse(serialized) as ListUrlParams;
    for (const key of keys.split(",")) {
      const value = values[key];
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (next.toString() === current.toString()) return;
    const query = next.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [enabled, keys, serialized]);
}

const SCROLL_KEY_PREFIX = "atlas-list-scroll:";
let lastHistoryNavigationAt = 0;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastHistoryNavigationAt = Date.now();
  });
}

/**
 * Remembers the scroll position of a list and restores it once the data is shown again after "back".
 * Fresh visits (menu links, typed address) always start at the top.
 */
export function useListScrollRestoration(listKey: string, ready: boolean) {
  const keyRef = useRef(listKey);
  const restoreRef = useRef<boolean | null>(null);

  useEffect(() => {
    keyRef.current = listKey;
  }, [listKey]);

  useEffect(() => {
    if (restoreRef.current === null) restoreRef.current = Date.now() - lastHistoryNavigationAt < 3000;
    const pathname = window.location.pathname;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function save() {
      timer = null;
      // After navigating to a profile the next page may scroll to the top; that must not overwrite the list position.
      if (window.location.pathname !== pathname) return;
      try {
        window.sessionStorage.setItem(SCROLL_KEY_PREFIX + keyRef.current, String(Math.round(window.scrollY)));
      } catch { /* Scroll memory is optional. */ }
    }
    function handleScroll() {
      timer ??= setTimeout(save, 150);
    }
    // Opening a profile from the list saves the position at the moment of the click as well.
    function handleClick(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest("a[href]")) save();
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleClick, true);
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pagehide", save);
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready || !restoreRef.current) return;
    restoreRef.current = false;
    let saved: number | null = null;
    try {
      saved = readPositiveInt(window.sessionStorage.getItem(SCROLL_KEY_PREFIX + keyRef.current));
    } catch { /* Scroll memory is optional. */ }
    if (saved) setTimeout(() => window.scrollTo({ top: saved }), 0);
  }, [ready]);
}
