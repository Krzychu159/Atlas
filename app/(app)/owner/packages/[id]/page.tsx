"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { getErrorMessage } from "@/app/lib/backend";
import {
  getPackage,
  getPackageClients,
  type Package,
  type PackageClient,
} from "@/app/lib/owner/packages";
import PackageDetailsHero from "./components/PackageDetailsHero";
import PackageEditCard from "./components/PackageEditCard";
import PackageClientsList from "./components/PackageClientsList";
import { isPeriodPackage } from "@/app/lib/period-packages";
import { showOwnerError } from "../../components/owner-toast";

export default function PackageDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const packageId = Number(id);

  const [item, setItem] = useState<Package | null>(null);
  const [clients, setClients] = useState<PackageClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isRetryingClients, setIsRetryingClients] = useState(false);
  const clientsRetryLoad = useRef<AbortController | null>(null);

  async function retryClients() {
    clientsRetryLoad.current?.abort();
    const controller = new AbortController();
    clientsRetryLoad.current = controller;
    setIsRetryingClients(true);
    try {
      const result = await getPackageClients(packageId, controller.signal);
      if (controller.signal.aborted) return;
      setClients(result);
      setClientsError(null);
    } catch (err) {
      if (!controller.signal.aborted) setClientsError(getErrorMessage(err, "Nie udało się pobrać klientów przypisanych do pakietu."));
    } finally {
      if (!controller.signal.aborted) setIsRetryingClients(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      await Promise.resolve();
      if (controller.signal.aborted) return;

      setItem(null);
      setClients([]);
      setError(null);
      setClientsError(null);
      setIsRetryingClients(false);
      setIsLoading(true);

      if (!Number.isSafeInteger(packageId) || packageId <= 0) {
        setError("Nie można otworzyć tego pakietu. Wróć do listy pakietów i wybierz go ponownie.");
        setIsLoading(false);
        return;
      }

      try {
        const [packageResult, clientsResult] = await Promise.allSettled([
          getPackage(packageId, controller.signal),
          getPackageClients(packageId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        if (packageResult.status === "rejected") throw packageResult.reason;
        setItem(packageResult.value);
        if (clientsResult.status === "fulfilled") {
          setClients(clientsResult.value);
        } else {
          setClientsError(getErrorMessage(clientsResult.reason, "Nie udało się pobrać klientów przypisanych do pakietu."));
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(err, "Nie udało się pobrać pakietu."));
        showOwnerError(err, "Nie udało się pobrać pakietu.", {
          id: "owner-package-load-error",
        });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadData();
    return () => { controller.abort(); clientsRetryLoad.current?.abort(); };
  }, [packageId, attempt]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] pb-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/owner/packages"
          className="inline-flex items-center gap-3 text-on-surface hover:text-primary-light"
        >
          <ArrowLeft size={20} className="text-primary-light" />
          <span className="text-lg font-semibold">Szczegóły pakietu</span>
        </Link>

      </div>

      {isLoading ? (
        <div className="mt-6 card-shell p-6 text-on-surface-variant">
          Ładowanie pakietu...
        </div>
      ) : null}

      {error ? <div role="alert" className="mt-6 card-shell flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-on-surface-variant">{error}</p>
        <Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Spróbuj ponownie</Button>
      </div> : null}

      {!isLoading && item?.id === packageId ? (
        <div className="mt-6 flex flex-col gap-5">
          <PackageDetailsHero item={item} clients={clients} clientsAvailable={!clientsError} />

          <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.65fr)]">
            <div className="min-w-0">
              <PackageEditCard item={item} onUpdated={setItem} />
            </div>

            <div className="min-w-0">
              {clientsError ? <div role="alert" className="card-shell flex flex-col gap-3 p-5">
                <p className="text-sm text-on-surface-variant">{clientsError}</p>
                <Button variant="secondary" disabled={isRetryingClients} onClick={() => void retryClients()}>{isRetryingClients ? "Pobieranie klientów..." : "Spróbuj ponownie"}</Button>
              </div> : <PackageClientsList clients={clients} packageId={item.id} periodBased={isPeriodPackage(item)} />}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
