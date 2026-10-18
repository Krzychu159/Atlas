"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { getErrorMessage, isAbortError } from "@/app/lib/backend";
import { getSessionCorrections, type SessionCorrection } from "@/app/lib/owner/sessions";
import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";
import { correctionChangeLabel } from "../session-utils";

export default function SessionCorrectionHistory({ sessionId }: { sessionId: number }) {
  const [history, setHistory] = useState<SessionCorrection[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const revision = useSessionCorrectionRevision();
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getSessionCorrections(sessionId, controller.signal);
        if (!controller.signal.aborted) setHistory(Array.isArray(data) ? [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []);
      } catch (err) {
        if (!controller.signal.aborted && !isAbortError(err)) setError(getErrorMessage(err, "Nie udało się pobrać historii zmian."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [sessionId, revision, attempt]);

  return (
    <section aria-label="Historia zmian sesji" aria-busy={loading}>
      {loading ? <p role="status" className="text-sm text-on-surface-variant">Ładowanie historii...</p> : error ? (
        <div role="alert" className="flex flex-col gap-3 text-sm text-error-light sm:flex-row sm:items-center sm:justify-between">
          {error}
          <Button type="button" variant="secondary" onClick={() => setAttempt(value => value + 1)}>Spróbuj ponownie</Button>
        </div>
      ) : history.length === 0 ? <p className="text-sm text-on-surface-variant">Ta sesja nie była jeszcze korygowana.</p> : (
        <ol className="space-y-3">
          {history.map((item) => (
            <li key={item.id} className="min-w-0 rounded-[var(--radius-md)] bg-surface-container p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-semibold text-on-surface">{correctionChangeLabel(item.changeType)}</p>
                <time dateTime={item.createdAt} className="text-xs text-on-surface-muted">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</time>
              </div>
              {item.reason ? <p className="mt-2 whitespace-pre-wrap break-words text-on-surface">{item.reason}</p> : null}
              <p className="mt-1 text-xs text-on-surface-muted">Zmienione przez: {item.changedByUserId == null ? "brak danych" : `użytkownik #${item.changedByUserId}`}</p>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-primary-light">Stan przed i po zmianie</summary>
                <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
                  {([["Przed", item.beforeState], ["Po", item.afterState]] as const).map(([label, state]) => (
                    <div key={label} className="min-w-0">
                      <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
                      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-md)] bg-surface-container-low p-2 text-xs">{state == null ? "Brak danych" : JSON.stringify(state, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
