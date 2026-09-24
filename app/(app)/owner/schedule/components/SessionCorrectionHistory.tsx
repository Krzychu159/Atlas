"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/app/lib/backend";
import { getSessionCorrections, type SessionCorrection } from "@/app/lib/owner/sessions";
import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";

export default function SessionCorrectionHistory({ sessionId }: { sessionId: number }) {
  const [history, setHistory] = useState<SessionCorrection[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const revision = useSessionCorrectionRevision();
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getSessionCorrections(sessionId);
        if (!cancelled) setHistory(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [sessionId, revision]);

  return (
    <section className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <h3 className="font-semibold">Historia korekt</h3>
      {loading ? <p className="mt-3 text-sm">Ładowanie historii...</p> : error ? (
        <p role="alert" className="mt-3 text-sm text-error">{error}</p>
      ) : history.length === 0 ? <p className="mt-3 text-sm text-on-surface-variant">Brak korekt.</p> : (
        <div className="mt-3 space-y-3">
          {history.map((item) => (
            <article key={item.id} className="min-w-0 rounded-[var(--radius-md)] bg-surface-container p-3 text-sm">
              <p>{new Date(item.createdAt).toLocaleString("pl-PL")} · {item.changeType}</p>
              <p className="mt-1 text-on-surface-variant">Zmienione przez: {item.changedByUserId == null ? "Brak danych" : `Użytkownik #${item.changedByUserId}`}</p>
              <p className="mt-2 whitespace-pre-wrap break-words">{item.reason}</p>
              <details className="mt-3">
                <summary className="cursor-pointer text-primary-light">Stan przed i po korekcie</summary>
                <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
                  {[["Przed", item.beforeState], ["Po", item.afterState]].map(([label, state]) => (
                    <div key={String(label)} className="min-w-0">
                      <p className="font-semibold">{String(label)}</p>
                      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(state, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
