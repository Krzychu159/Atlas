"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { getErrorMessage } from "@/app/lib/backend";

// Local to mounted Owner sections; no cache, retries of mutations or shared data.
export function useOwnerRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>, fallback: string, revision: string | number = 0, delay = 0, enabled = true) {
  const [result, setResult] = useState<{ key: string; data?: T; loading: boolean; error?: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const scope = useRef<{ key: string; load: typeof load } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (!mounted.current || !enabled || scope.current?.key !== key || scope.current.load !== load) return;
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setResult(current => ({ key, data: current?.key === key ? current.data : undefined, loading: true }));
    try {
      const data = await load(controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setResult({ key, data, loading: false });
      return data;
    } catch (error) {
      if (controller.signal.aborted || !mounted.current) return;
      setResult(current => ({ key, data: current?.key === key ? current.data : undefined, loading: false, error: getErrorMessage(error, fallback) }));
      throw error;
    }
  }, [key, load, fallback, enabled]);

  useEffect(() => {
    mounted.current = true;
    scope.current = { key, load };
    // Keep updates out of the synchronous effect; allow StrictMode cleanup first.
    let live = true;
    const start = () => { if (live && enabled) void reload().catch(() => undefined); };
    if (delay) timer.current = setTimeout(start, delay);
    else void Promise.resolve().then(start);
    return () => {
      live = false;
      mounted.current = false;
      if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
      active.current?.abort();
    };
  }, [key, load, reload, revision, delay, enabled]);

  const setData = useCallback((value: SetStateAction<T | undefined>) => {
    if (!mounted.current || scope.current?.key !== key) return;
    active.current?.abort();
    setResult(current => {
      const previous = current?.key === key ? current.data : undefined;
      const data = typeof value === "function" ? (value as (current: T | undefined) => T | undefined)(previous) : value;
      return { key, data, loading: false };
    });
  }, [key]);

  const current = enabled && result?.key === key ? result : null;
  return { data: current?.data, loading: enabled && (current?.loading ?? true), error: current?.error,
    reload, retry: () => { void reload().catch(() => undefined); }, setData };
}
