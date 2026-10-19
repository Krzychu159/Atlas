"use client";

import { use, useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import PackageDetailsHero from "@/app/components/packages/PackageDetailsHero";
import { getTrainerPackage, type TrainerPackage } from "@/app/lib/trainer/packages";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";

export default function TrainerPackageDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const packageId = Number(id);

  const [item, setItem] = useState<TrainerPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPackage() {
      await Promise.resolve();
      if (controller.signal.aborted) return;

      setItem(null);
      setError(null);
      setIsLoading(true);

      if (!Number.isSafeInteger(packageId) || packageId <= 0) {
        setError("Nie można otworzyć tego pakietu. Wróć do listy pakietów i wybierz go ponownie.");
        setIsLoading(false);
        return;
      }

      try {
        const result = await getTrainerPackage(packageId, controller.signal);
        if (!controller.signal.aborted) setItem(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(trainerPaymentError(err, "Nie udało się pobrać pakietu."));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadPackage();
    return () => controller.abort();
  }, [packageId, attempt]);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-3 pb-10">
      {isLoading ? (
        <div role="status" className="card-shell p-4 text-sm text-on-surface-variant">
          Ładowanie pakietu...
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="card-shell flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-on-surface-variant">{error}</p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Spróbuj ponownie</Button>
        </div>
      ) : null}

      {!isLoading && item?.id === packageId ? (
        <PackageDetailsHero item={item} backHref="/trainer/packages" />
      ) : null}
    </div>
  );
}
