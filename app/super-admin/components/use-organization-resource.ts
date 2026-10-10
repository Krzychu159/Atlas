"use client";

import { useEffect, useState } from "react";

export function useOrganizationResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T | null; error: unknown } | null>(null);
  const requestKey = `${key}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ key: requestKey, data, error: null }); },
      error => { if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error }); },
    );
    return () => controller.abort();
  }, [load, requestKey]);

  const current = result?.key === requestKey ? result : null;
  return {
    loading: !current,
    data: current?.data ?? null,
    error: current?.error ?? null,
    retry: () => setAttempt(value => value + 1),
  };
}
