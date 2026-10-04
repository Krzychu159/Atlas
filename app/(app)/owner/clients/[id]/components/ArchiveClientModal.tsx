"use client";

import { Archive } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import type { ClientArchiveCheck } from "@/app/lib/owner/clients";

const blockerLabels: Record<string, string> = {
  FutureSessions: "Klient ma przyszłe lub trwające sesje. Uporządkuj grafik.",
  UnfinishedSessions: "Klient ma wcześniejsze sesje, które nie zostały zakończone ani anulowane.",
  ActivePackages: "Klient ma aktywny pakiet.",
  PendingPayments: "Są płatności oczekujące na potwierdzenie.",
  UnpaidPackages: "Pozostały nieopłacone kwoty pakietów.",
  OutstandingBalance: "Saldo klienta wymaga rozliczenia.",
};

export default function ArchiveClientModal({
  check,
  isArchiving,
  onClose,
  onConfirm,
}: {
  check: ClientArchiveCheck | null;
  isArchiving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!check) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="relative z-10 w-full max-w-[540px] rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="p-6">
          <ModalHeader
            eyebrow="Archiwizacja"
            title={check.canArchive ? "Archiwizować klienta?" : "Nie można zarchiwizować klienta"}
            description={check.canArchive ? "Kartoteka zniknie z aktywnej listy klientów." : "Najpierw usuń poniższe blokady."}
            icon={<Archive size={20} />}
            iconTone={check.canArchive ? "primary" : "danger"}
            onClose={onClose}
          />

          {!check.canArchive ? (
            <ul className="mt-6 flex flex-col gap-3">
              {check.blockers.map((blocker) => (
                <li key={blocker} className="rounded-[var(--radius-lg)] bg-error-container/30 px-4 py-3 text-sm text-on-surface">
                  {blockerLabels[blocker] || "Nie można jeszcze zarchiwizować klienta. Sprawdź jego treningi, pakiety i rozliczenia."}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={isArchiving}>
            {check.canArchive ? "Anuluj" : "Zamknij"}
          </Button>
          {check.canArchive ? (
            <Button onClick={onConfirm} disabled={isArchiving} icon={<Archive size={16} />}>
              {isArchiving ? "Archiwizowanie..." : "Archiwizuj"}
            </Button>
          ) : null}
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
