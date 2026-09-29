"use client";

import { useState } from "react";
import TermsAcceptance from "@/app/components/legal/TermsAcceptance";
import { Button } from "@/app/components/ui/button";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import {
  acceptLegalTerms,
  type LegalRequirements,
} from "@/app/lib/legal";

type LegalTermsConsentCardProps = {
  requirements: LegalRequirements;
  locationName?: string | null;
  onAccepted?: (requirements: LegalRequirements) => void;
};

export default function LegalTermsConsentCard({
  requirements,
  locationName,
  onAccepted,
}: LegalTermsConsentCardProps) {
  const [checked, setChecked] = useState(false);
  const [isAccepted, setIsAccepted] = useState(requirements.isAccepted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const termsVersion = requirements.termsVersion;
  const termsUrl = requirements.termsUrl;
  const hasDocument = Boolean(termsVersion && termsUrl);

  async function handleAccept() {
    if (!requirements.termsVersion || !checked) return;

    try {
      setIsSubmitting(true);
      await acceptLegalTerms({
        locationId: requirements.locationId,
        acceptTerms: true,
        termsVersion: requirements.termsVersion,
      });

      const acceptedRequirements = { ...requirements, isAccepted: true };
      setIsAccepted(true);
      setChecked(false);
      showAppSuccess("Regulamin studia został zaakceptowany.", {
        id: `legal-terms-accepted-${requirements.locationId}`,
      });
      onAccepted?.(acceptedRequirements);
    } catch (error) {
      showAppError(error, "Nie udało się zaakceptować regulaminu studia.", {
        id: `legal-terms-accept-error-${requirements.locationId}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {locationName ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
          Lokalizacja: {locationName}
        </p>
      ) : null}

      {termsVersion && termsUrl ? (
        <TermsAcceptance
          id={`terms-acceptance-${requirements.locationId}`}
          companyName={requirements.legalEntityName}
          termsVersion={termsVersion}
          termsUrl={termsUrl}
          acceptanceRequired={requirements.acceptanceRequired}
          isAccepted={isAccepted}
          checked={checked}
          onCheckedChange={setChecked}
          disabled={isSubmitting}
        />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-lowest p-4">
          <p className="text-sm font-semibold text-on-surface">
            {requirements.legalEntityName}
          </p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Dokument aktualnego regulaminu nie jest dostępny. Skontaktuj się ze
            studiem.
          </p>
        </div>
      )}

      {!isAccepted && requirements.acceptanceRequired && hasDocument ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={!checked || isSubmitting}
            onClick={handleAccept}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Akceptowanie..." : "Zaakceptuj regulamin"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
