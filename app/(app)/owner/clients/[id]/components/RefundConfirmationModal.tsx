"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { OwnerTextArea } from "../../../components/OwnerFormControls";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";
import { formatMoney } from "@/app/lib/formatters/money";
import type { ClientRefund } from "@/app/lib/owner/clients";

export default function RefundConfirmationModal({
  refund,
  submitting,
  onClose,
  onConfirm,
}: {
  refund: ClientRefund | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reference: string) => Promise<void>;
}) {
  const [reference, setReference] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!refund) return;
    setReference(refund.reference || "");
    setValidationMessage("");
  }, [refund]);

  if (!refund) return null;

  async function handleConfirm() {
    const cleanReference = reference.trim();

    if (!cleanReference || cleanReference.length > 1000) {
      setValidationMessage("Podaj potwierdzenie wykonania zwrotu (1–1000 znaków).");
      return;
    }

    setValidationMessage("");
    await onConfirm(cleanReference);
  }

  return (
    <ModalOverlay onClose={submitting ? undefined : onClose}>
      <div className="relative z-10 w-full max-w-[540px] rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="p-6">
          <ModalHeader
            eyebrow="Zwrot klienta"
            title="Potwierdź wykonany zwrot"
            description="Zapisujesz potwierdzenie zwrotu wykonanego poza Atlasem. Ta czynność nie wysyła pieniędzy."
            icon={<BadgeCheck size={20} />}
            onClose={submitting ? () => undefined : onClose}
          />

          <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
            <p className="text-label text-on-surface-muted">Kwota zwrotu</p>
            <p className="mt-2 text-xl font-semibold text-on-surface">
              {formatMoney(refund.amount, refund.currency)}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {refund.packageName || "Pakiet klienta"}
            </p>
          </div>

          <OwnerTextArea
            label="Potwierdzenie zwrotu"
            value={reference}
            onChange={setReference}
            minLength={1}
            maxLength={1000}
            required
            rows={3}
            disabled={submitting}
            placeholder="Np. numer przelewu lub opis potwierdzenia"
            className="mt-5 block"
          />
          <p className="mt-1 text-right text-xs text-on-surface-muted">
            {reference.length}/1000
          </p>

          {validationMessage ? (
            <p className="mt-4 rounded-[var(--radius-lg)] bg-error-container/30 px-4 py-3 text-sm text-error-light">
              {validationMessage}
            </p>
          ) : null}
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Anuluj
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Zapisywanie..." : "Potwierdź wykonany zwrot"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
