"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CURRENT_USER_CHANGED_EVENT, getCurrentUser, type CurrentUser } from "@/app/lib/auth/current-user";
import { clearBackendRequests, SESSION_CLEARED_EVENT, getErrorMessage } from "@/app/lib/backend";
import { clearNotificationMemory } from "@/app/lib/notifications";

type Identity = { user: CurrentUser | null; loading: boolean; error: string | null; refresh: () => Promise<void> };
const CurrentUserContext = createContext<Identity | null>(null);

export function CurrentUserProvider({ initialUser, children }: { initialUser: CurrentUser; children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const pending = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    clearBackendRequests();
    clearNotificationMemory();
    return () => { revision.current += 1; pending.current?.abort(); clearBackendRequests(); clearNotificationMemory(); };
  }, [initialUser.id]);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError(null);
    try {
      const next = await getCurrentUser(controller.signal);
      if (current !== revision.current) return;
      if (next.id !== initialUser.id || next.role !== initialUser.role) {
        clearBackendRequests(); setUser(null); window.location.reload(); return;
      }
      setUser(next);
    } catch (cause) {
      if (current === revision.current && !controller.signal.aborted) setError(getErrorMessage(cause, "Nie udało się pobrać profilu."));
    } finally { if (current === revision.current) setLoading(false); }
  }, [initialUser.id, initialUser.role]);
  useEffect(() => {
    const changed = (event: Event) => {
      const updated = (event as CustomEvent<CurrentUser>).detail;
      if (updated && updated.id === initialUser.id && updated.role === initialUser.role) {
        revision.current += 1; pending.current?.abort(); setUser(updated); setError(null); setLoading(false);
      } else void refresh();
    };
    const clear = () => { revision.current += 1; pending.current?.abort(); clearBackendRequests(); clearNotificationMemory(); setUser(null); };
    const storage = (event: StorageEvent) => {
      if (event.key === SESSION_CLEARED_EVENT) { clear(); window.location.reload(); }
    };
    window.addEventListener(CURRENT_USER_CHANGED_EVENT, changed);
    window.addEventListener(SESSION_CLEARED_EVENT, clear);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(CURRENT_USER_CHANGED_EVENT, changed);
      window.removeEventListener(SESSION_CLEARED_EVENT, clear);
      window.removeEventListener("storage", storage);
    };
  }, [refresh, initialUser.id, initialUser.role]);
  return <CurrentUserContext.Provider value={{ user, loading, error, refresh }}>{user ? children : <p role="status" className="p-8">Odświeżamy dostęp…</p>}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const identity = useContext(CurrentUserContext);
  if (!identity) throw new Error("Brakuje profilu użytkownika.");
  return identity;
}
