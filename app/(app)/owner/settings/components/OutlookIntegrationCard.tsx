"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarSync, CheckCircle2, ExternalLink, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import {
  disconnectOutlook,
  getOutlookConnectUrl,
  getOutlookStatus,
  type OutlookStatus,
} from "@/app/lib/owner/outlook";

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
  const authWindowRef = useRef<Window | null>(null);
  const pollingRef = useRef<number | null>(null);

  async function loadStatus() {
    try {
      setIsLoading(true);
      const data = await getOutlookStatus();
      setStatus(data);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się sprawdzić połączenia Outlook.",
        { id: "outlook-status-error" },
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
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
          toast.success("Konto Microsoft zostało połączone.", {
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
        throw new Error("Backend nie zwrócił adresu połączenia Microsoft.");
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
      toast.info(
        "Autoryzacja Microsoft otworzyła się w nowym oknie. Zamkniemy je automatycznie po połączeniu.",
        { id: "outlook-connect-started" },
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się rozpocząć łączenia z Microsoft.",
        { id: "outlook-connect-error" },
      );
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
      toast.success("Konto Microsoft zostało odłączone.", {
        id: "outlook-disconnected",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nie udało się odłączyć Outlook.",
        { id: "outlook-disconnect-error" },
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  const connected = Boolean(status?.isConnected);

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
              Grafik. Na tym etapie panel tylko wyświetla sesje z backendu.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {connected ? (
            <Button
              variant="outline"
              icon={<Unplug size={16} />}
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Odłączanie..." : "Odłącz"}
            </Button>
          ) : (
            <Button
              icon={<ExternalLink size={16} />}
              onClick={handleConnect}
              disabled={isLoading || isConnecting}
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
    </section>
  );
}
