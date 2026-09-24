"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarSync,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  Unplug,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ModalOverlay, ModalHeader, ModalFooter } from "@/app/components/ui/modal";
import { deleteSessionSeries, syncSessionSeriesOutlook } from "@/app/lib/owner/sessions";
import { notifySessionCorrected } from "@/app/lib/session-corrections";
import {
  showAppError,
  showAppInfo,
  showAppSuccess,
} from "@/app/components/ui/app-toast";
import {
  disconnectOutlook,
  getOutlookConnectUrl,
  getOutlookStatus,
  syncOutlookClients,
  reconcileOutlook,
  type OutlookReconcileResult,
  type OutlookSeriesAttention,
  type OutlookStatus,
} from "@/app/lib/calendar/outlook";

function formatConnectedDate(value: string | null) {
  if (!value) return "Brak daty połączenia";

  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OutlookIntegrationCard() {
  const [status, setStatus] = useState<OutlookStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [result, setResult] = useState<OutlookReconcileResult | null>(null);
  const [series, setSeries] = useState<OutlookSeriesAttention[]>([]);
  const [seriesAction, setSeriesAction] = useState<{ id: string; action: "retry" | "delete" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const syncLock = useRef(false);
  const authWindowRef = useRef<Window | null>(null);
  const pollingRef = useRef<number | null>(null);

  async function loadStatus() {
    try {
      setIsLoading(true);
      const data = await getOutlookStatus();
      setStatus(data);
    } catch (err) {
      showAppError(err, "Nie udało się sprawdzić połączenia Outlook.", {
        id: "outlook-status-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function stopConnectPolling() {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setIsConnecting(false);
  }

  function closeAuthWindow() {
    try {
      authWindowRef.current?.close();
    } catch {
      // The OAuth callback is cross-origin, but opener-owned windows can usually be closed.
    } finally {
      authWindowRef.current = null;
    }
  }

  function startConnectPolling(authWindow: Window) {
    let attempts = 0;
    authWindowRef.current = authWindow;

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
    }

    pollingRef.current = window.setInterval(async () => {
      attempts += 1;

      try {
        const data = await getOutlookStatus();
        setStatus(data);

        if (data.isConnected) {
          closeAuthWindow();
          stopConnectPolling();
          showAppSuccess("Konto Microsoft zostało połączone.", {
            id: "outlook-connected",
          });
          return;
        }
      } catch {
        // Retry on the next tick. The regular status check handles visible errors.
      }

      if (authWindow.closed || attempts >= 60) {
        stopConnectPolling();
        await loadStatus();
      }
    }, 1500);
  }

  async function handleConnect() {
    try {
      setIsConnecting(true);
      const data = await getOutlookConnectUrl();

      if (!data.url) {
        throw new Error("Nie udało się przygotować połączenia Microsoft.");
      }

      const authWindow = window.open(
        data.url,
        "atlas-outlook-connect",
        "width=720,height=760,menubar=no,toolbar=no,location=yes,status=no",
      );

      if (!authWindow) {
        throw new Error(
          "Nie udało się otworzyć okna Microsoft. Odblokuj wyskakujące okna dla StudioCRM i spróbuj ponownie.",
        );
      }

      startConnectPolling(authWindow);
      showAppInfo(
        "Autoryzacja Microsoft otworzyła się w nowym oknie. Zamkniemy je automatycznie po połączeniu.",
        { id: "outlook-connect-started" },
      );
    } catch (err) {
      showAppError(err, "Nie udało się rozpocząć łączenia z Microsoft.", {
        id: "outlook-connect-error",
      });
      stopConnectPolling();
    }
  }

  useEffect(() => {
    function handleFocus() {
      loadStatus();
    }

    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, []);

  async function handleDisconnect() {
    try {
      setIsDisconnecting(true);
      await disconnectOutlook();
      await loadStatus();
      showAppSuccess("Konto Microsoft zostało odłączone.", {
        id: "outlook-disconnected",
      });
    } catch (err) {
      showAppError(err, "Nie udało się odłączyć Outlook.", {
        id: "outlook-disconnect-error",
      });
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handleSyncClients() {
    try {
      setIsSyncing(true);
      await syncOutlookClients();
      await loadStatus();
      showAppSuccess("Kontakty klientów zostały zsynchronizowane z Outlook.", {
        id: "outlook-clients-sync-success",
      });
    } catch (err) {
      showAppError(err, "Nie udało się zsynchronizować kontaktów klientów.", {
        id: "outlook-clients-sync-error",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  const connected = Boolean(status?.isConnected);
  const busy = isReconciling || seriesAction !== null;

  function showSyncWarning(data: { outlookSeriesSynced?: boolean; outlookSyncWarning?: string | null }) {
    const warning = data.outlookSyncWarning || (data.outlookSeriesSynced === false
      ? "Seria istnieje w CRM, ale nie została zsynchronizowana z Outlookiem."
      : null);
    setSyncWarning(warning);
    if (warning) showAppInfo(warning);
  }

  async function handleReconcile() {
    if (syncLock.current) return;
    syncLock.current = true;
    setIsReconciling(true);
    setSyncWarning(null);
    try {
      const data = await reconcileOutlook();
      setResult(data);
      setSeries(data.seriesRequiringAttention ?? []);
      showSyncWarning(data);
    } catch (err) {
      showAppError(err, "Nie udało się zsynchronizować Outlook.");
    } finally {
      notifySessionCorrected();
      await loadStatus();
      setIsReconciling(false);
      syncLock.current = false;
    }
  }

  async function handleSeriesAction(id: string, action: "retry" | "delete") {
    if (syncLock.current) return;
    syncLock.current = true;
    setSeriesAction({ id, action });
    setSyncWarning(null);
    try {
      if (action === "delete") {
        await deleteSessionSeries(id);
        setSeries((current) => current.filter((item) => getSeriesId(item) !== id));
        setDeleteTarget(null);
        showAppSuccess("Seria została usunięta.");
      } else {
        const data = await syncSessionSeriesOutlook(id);
        showSyncWarning(data);
        if (data.outlookSeriesSynced === true) {
          setSeries((current) => current.filter((item) => getSeriesId(item) !== id));
          showAppSuccess("Seria została zsynchronizowana z Outlookiem.");
        } else {
          setSeries((current) => current.map((item) => getSeriesId(item) === id
            ? { recurringGroupId: id, ...data } : item));
        }
      }
    } catch (err) {
      showAppError(err, action === "delete" ? "Nie udało się usunąć serii." : "Nie udało się zsynchronizować serii.");
    } finally {
      notifySessionCorrected();
      await loadStatus();
      setSeriesAction(null);
      syncLock.current = false;
    }
  }

  return (
    <section className="card-shell overflow-hidden p-6 md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)]",
              connected
                ? "bg-tertiary-container text-tertiary-light"
                : "bg-surface-container-low text-primary-light",
            ].join(" ")}
          >
            {isLoading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : connected ? (
              <CheckCircle2 size={22} />
            ) : (
              <CalendarSync size={22} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-section-title">Kalendarz Microsoft Outlook</p>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-on-surface-variant">
              Połączenie służy do pobierania i synchronizacji sesji w zakładce
              Grafik.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-[440px]">
          <Button
            icon={<RefreshCw size={16} className={isReconciling ? "animate-spin" : ""} />}
            onClick={handleReconcile}
            disabled={!connected || isLoading || isConnecting || isDisconnecting || isSyncing || busy}
            className="w-full sm:w-auto"
          >
            {isReconciling ? "Synchronizowanie..." : "Synchronizuj teraz"}
          </Button>
          <Button
            variant="secondary"
            icon={
              <RefreshCw
                size={16}
                className={isSyncing ? "animate-spin" : ""}
              />
            }
            onClick={handleSyncClients}
            disabled={
              !connected ||
              isLoading ||
              isConnecting ||
              isDisconnecting ||
              isSyncing || busy
            }
            className="w-full sm:w-auto"
          >
            {isSyncing ? "Synchronizowanie kontaktów..." : "Synchronizuj kontakty"}
          </Button>
          {connected ? (
            <Button
              variant="outline"
              icon={<Unplug size={16} />}
              onClick={handleDisconnect}
              disabled={isDisconnecting || isSyncing || busy}
              className="w-full sm:w-auto"
            >
              {isDisconnecting ? "Odłączanie..." : "Odłącz"}
            </Button>
          ) : (
            <Button
              icon={<ExternalLink size={16} />}
              onClick={handleConnect}
              disabled={isLoading || isConnecting || isSyncing || busy}
              className="w-full sm:w-auto"
            >
              {isConnecting ? "Przekierowanie..." : "Połącz Microsoft"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
          <p className="text-label text-on-surface-muted">Status</p>
          <p
            className={[
              "mt-2 text-sm font-semibold",
              connected ? "text-tertiary-light" : "text-warning-light",
            ].join(" ")}
          >
            {isLoading
              ? "Sprawdzanie..."
              : connected
                ? "Połączono"
                : "Niepołączono"}
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
          <p className="text-label text-on-surface-muted">Konto</p>
          <p className="mt-2 truncate text-sm font-semibold text-on-surface">
            {status?.email || "Brak połączonego konta"}
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
          <p className="text-label text-on-surface-muted">Połączono</p>
          <p className="mt-2 text-sm font-semibold text-on-surface">
            {formatConnectedDate(status?.connectedAt ?? null)}
          </p>
        </div>
      </div>
      {syncWarning && (
        <p role="status" className="mt-5 rounded-[var(--radius-lg)] bg-warning-container p-4 text-sm text-warning-light">{syncWarning}</p>
      )}

      {result && (
        <div className="mt-6 space-y-4" aria-live="polite">
          <h3 className="font-semibold">Wynik synchronizacji</h3>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Przetworzone integracje", result.integrationsProcessed],
              ["Znalezione wydarzenia Outlook", result.outlookEventsFound],
              ["Zaimportowane lub zaktualizowane", result.importedOrUpdatedEvents],
              ["Brakujące wydarzenia oznaczone jako usunięte", result.missingOutlookEventsMarkedDeleted],
              ["Sesje CRM zsynchronizowane z Outlook", result.crmSessionsSyncedToOutlook],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
                <dt className="text-sm text-on-surface-variant">{label}</dt>
                <dd className="mt-2 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {!!result.errors?.length && (
            <details className="rounded-[var(--radius-lg)] bg-error-container p-4">
              <summary className="cursor-pointer font-semibold text-error-light">Błędy synchronizacji ({result.errors.length})</summary>
              <ul className="mt-3 space-y-2 text-sm">
                {result.errors.map((error, index) => (
                  <li key={index} className="whitespace-pre-wrap break-words">{typeof error === "string" ? error : JSON.stringify(error, null, 2)}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {series.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold">Serie wymagające uwagi</h3>
          {series.map((item) => {
            const id = getSeriesId(item);
            const warning = typeof item === "string" ? null : item.outlookSyncWarning ||
              (item.outlookSeriesSynced === false ? "Seria nie została zsynchronizowana z Outlookiem." : null);
            return (
              <div key={id} className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
                <p className="break-all text-sm font-semibold">Seria {id}</p>
                {warning && <p className="mt-2 text-sm text-warning-light">{warning}</p>}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button variant="secondary" disabled={busy || isLoading || isSyncing || isDisconnecting}
                    icon={<RefreshCw size={16} className={seriesAction?.id === id && seriesAction.action === "retry" ? "animate-spin" : ""} />}
                    onClick={() => void handleSeriesAction(id, "retry")}>
                    {seriesAction?.id === id && seriesAction.action === "retry" ? "Synchronizowanie..." : "Ponów synchronizację"}
                  </Button>
                  <Button variant="danger" icon={<Trash2 size={16} />} disabled={busy || isLoading || isSyncing || isDisconnecting}
                    onClick={() => setDeleteTarget(id)}>Usuń błędną serię</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ModalOverlay onClose={() => { if (!busy) setDeleteTarget(null); }}>
          <div role="dialog" aria-modal="true" aria-label="Usunięcie błędnej serii"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
            <div className="p-5 md:p-6">
              <ModalHeader title="Usunąć błędną serię?" icon={<Trash2 size={20} />} iconTone="danger"
                description="Operacja dotyczy całej wskazanej serii, a nie pojedynczego wystąpienia."
                onClose={() => { if (!busy) setDeleteTarget(null); }} />
              <p className="mt-3 break-all text-sm text-on-surface-variant">{deleteTarget}</p>
            </div>
            <ModalFooter>
              <Button variant="secondary" disabled={busy} onClick={() => setDeleteTarget(null)}>Anuluj</Button>
              <Button variant="danger" disabled={busy} icon={busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                onClick={() => void handleSeriesAction(deleteTarget, "delete")}>
                {busy ? "Usuwanie..." : "Usuń serię"}
              </Button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}
    </section>
  );
}

function getSeriesId(item: OutlookSeriesAttention) {
  return typeof item === "string" ? item : item.recurringGroupId;
}
