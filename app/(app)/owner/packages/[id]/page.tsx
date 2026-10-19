"use client";

import { use, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { getErrorMessage } from "@/app/lib/backend";
import {
  getPackage,
  getPackageClients,
  type Package,
  type PackageClient,
} from "@/app/lib/owner/packages";
import PackageDetailsHero from "@/app/components/packages/PackageDetailsHero";
import PackageEditModal from "./components/PackageEditModal";
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
  const [isEditOpen, setIsEditOpen] = useState(false);
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
    <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-3 pb-10">
      {isLoading ? (
        <div role="status" className="card-shell p-4 text-sm text-on-surface-variant">
          Ładowanie pakietu...
        </div>
      ) : null}

      {error ? <div role="alert" className="card-shell flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-on-surface-variant">{error}</p>
        <Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Spróbuj ponownie</Button>
      </div> : null}

      {!isLoading && item?.id === packageId ? (
        <>
          <PackageDetailsHero item={item} backHref="/owner/packages" clientStats={{ clients, available: !clientsError }} onEdit={() => setIsEditOpen(true)} />

          {clientsError ? <div role="alert" className="card-shell flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">{clientsError}</p>
            <Button variant="secondary" disabled={isRetryingClients} onClick={() => void retryClients()}>{isRetryingClients ? "Pobieranie klientów..." : "Spróbuj ponownie"}</Button>
          </div> : <PackageClientsList clients={clients} packageId={item.id} periodBased={isPeriodPackage(item)} />}

          {isEditOpen ? <PackageEditModal item={item} onUpdated={setItem} onClose={() => setIsEditOpen(false)} /> : null}
        </>
      ) : null}
    </div>
  );
}
