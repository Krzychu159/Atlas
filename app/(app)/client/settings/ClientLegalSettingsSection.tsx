"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import LegalTermsConsentCard from "@/app/components/legal/LegalTermsConsentCard";
import { showAppError } from "@/app/components/ui/app-toast";
import {
  getClientPortalBilling,
  type ClientPackageBilling,
} from "@/app/lib/client/portal";
import {
  getLegalRequirements,
  type LegalRequirements,
} from "@/app/lib/legal";

type LocationTerms = {
  locationId: number;
  locationName: string | null;
  requirements: LegalRequirements;
};

export default function ClientLegalSettingsSection() {
  const [items, setItems] = useState<LocationTerms[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTerms() {
      try {
        const billing = await getClientPortalBilling();
        const locations = getPackageLocations(billing.packages || []);
        const requirements = await Promise.all(
          locations.map(async (location) => ({
            ...location,
            requirements: await getLegalRequirements(location.locationId),
          })),
        );

        if (active) setItems(requirements);
      } catch (error) {
        if (!active) return;
        showAppError(error, "Nie udało się pobrać regulaminu studia.", {
          id: "client-settings-legal-load-error",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadTerms();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="studio-terms" className="card-shell scroll-mt-6 p-5 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
          <ScrollText size={18} />
        </div>
        <div>
          <p className="text-section-title">Regulamin studia</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Sprawdź aktualną wersję i stan akceptacji regulaminu.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-surface-container-lowest" />
        ) : items.length ? (
          items.map((item) => (
            <LegalTermsConsentCard
              key={item.locationId}
              requirements={item.requirements}
              locationName={item.locationName}
              onAccepted={(requirements) =>
                setItems((current) =>
                  current.map((entry) =>
                    entry.locationId === requirements.locationId
                      ? { ...entry, requirements }
                      : entry,
                  ),
                )
              }
            />
          ))
        ) : (
          <p className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
            Regulamin pojawi się tutaj po przypisaniu pakietu do lokalizacji.
          </p>
        )}
      </div>
    </section>
  );
}

function getPackageLocations(packages: ClientPackageBilling[]) {
  const locations = new Map<
    number,
    { locationId: number; locationName: string | null }
  >();

  packages.forEach((clientPackage) => {
    if (clientPackage.locationId === null) return;
    locations.set(clientPackage.locationId, {
      locationId: clientPackage.locationId,
      locationName: clientPackage.locationName,
    });
  });

  return [...locations.values()];
}
