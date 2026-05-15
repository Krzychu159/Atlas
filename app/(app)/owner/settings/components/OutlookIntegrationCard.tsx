"use client";

import { useEffect, useState } from "react";
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

  async function handleConnect() {
    try {
      setIsConnecting(true);
      const data = await getOutlookConnectUrl();

      if (!data.url) {
        throw new Error("Backend nie zwrócił adresu połączenia Microsoft.");
      }

      window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się rozpocząć łączenia z Microsoft.",
        { id: "outlook-connect-error" },
      );
      setIsConnecting(false);
    }
  }

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
