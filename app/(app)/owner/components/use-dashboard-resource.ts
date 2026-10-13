"use client";
import { useEffect, useState } from "react";
import { dashboardError } from "@/app/lib/owner/dashboard-overview";

export function useDashboardResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; attempt: number; data?: T; error?: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ key, attempt, data }); },
      error => { if (!controller.signal.aborted) setResult({ key, attempt, error: dashboardError(error) }); },
    );
    return () => controller.abort();
  }, [key, attempt, load]);
  const current = result?.key === key && result.attempt === attempt ? result : null;
  return { data: current?.data, error: current?.error, loading: !current, retry: () => setAttempt(value => value + 1) };
}
