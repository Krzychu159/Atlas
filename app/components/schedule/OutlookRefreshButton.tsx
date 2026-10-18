"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { showAppError, showAppInfo, showAppSuccess } from "@/app/components/ui/app-toast";
import { isAbortError } from "@/app/lib/backend";
import { reconcileOutlook } from "@/app/lib/calendar/outlook";
import { notifySessionCorrected } from "@/app/lib/session-corrections";

// Refreshes only the signed-in user's own calendar; the schedule reloads through the correction event.
export default function OutlookRefreshButton({ disabled = false, className }: { disabled?: boolean; className?: string }) {
  const [running, setRunning] = useState(false);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function handleRefresh() {
    if (lock.current) return;
    lock.current = true;
    const request = new AbortController();
    controller.current = request;
    setRunning(true);
    try {
      const result = await reconcileOutlook({ kind: "mine" }, request.signal);
      if (request.signal.aborted) return;
      notifySessionCorrected();
      if (result.errors?.length) showAppInfo("Kalendarz został odświeżony, ale części wydarzeń nie udało się zsynchronizować. Spróbuj ponownie za chwilę.", { id: "outlook-own-refresh" });
      else showAppSuccess("Twój kalendarz Outlook został odświeżony.", { id: "outlook-own-refresh" });
    } catch (error) {
      if (!isAbortError(error)) showAppError(error, "Nie udało się odświeżyć kalendarza Outlook. Spróbuj ponownie.", { id: "outlook-own-refresh" });
    } finally {
      if (controller.current === request) controller.current = null;
      lock.current = false;
      if (!request.signal.aborted) setRunning(false);
    }
  }

  return (
    <Button
      variant="secondary"
      icon={running ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
      disabled={disabled || running}
      aria-busy={running}
      onClick={() => void handleRefresh()}
      className={className}
    >
      {running ? "Odświeżanie Outlooka…" : "Odśwież mój Outlook"}
    </Button>
  );
}
