"use client";

import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Repeat2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";
import { formatMoney } from "@/app/lib/formatters/money";
import type { ClientSubscription } from "@/app/lib/owner/clients";
import type { ClientBillingSummary } from "@/app/lib/owner/billing";
import type { OwnerSession } from "@/app/lib/owner/sessions";

export default function EndCooperationModal({
  open,
  loading,
  subscription,
  billing,
  sessions,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  subscription: ClientSubscription | null;
  billing: ClientBillingSummary | null;
  sessions: OwnerSession[];
  onClose: () => void;
}) {
  if (!open) return null;

  const cycle = subscription?.currentCycle;
  const activePackage =
    billing?.packages?.find((item) => item.isActive) || null;
  const currency = cycle?.currency || activePackage?.currency || "PLN";
  const totalSessions =
    cycle?.totalSessions ?? activePackage?.totalSessions ?? 0;
  const usedSessions = cycle?.usedSessions ?? activePackage?.usedSessions ?? 0;
  const remainingSessions =
    cycle?.remainingSessions ?? activePackage?.remainingSessions ?? 0;
  const amountDue = cycle?.amountDue ?? activePackage?.amountDue ?? 0;
  const currentBalance = billing?.currentBalance ?? 0;
  const futureSessions = sessions.filter(isFutureSession);

  return (
    <ModalOverlay onClose={onClose} className="px-4 py-8">
      <div className="relative z-10 flex max-h-full w-full max-w-[680px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <ModalHeader
            eyebrow="Zakończenie współpracy"
            title="Rozliczenie klienta"
            description="Zakończenie współpracy wymaga rozliczenia pakietu. Poniższe dane są wyłącznie podsumowaniem aktualnego stanu."
            icon={<AlertTriangle size={20} />}
            iconTone="danger"
            onClose={onClose}
          />

          {loading ? (
            <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
              Pobieranie aktualnych danych rozliczenia...
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <SummaryCard
                  label="Aktywny pakiet"
                  value={
                    cycle?.packageName ||
                    activePackage?.packageName ||
                    "Brak aktywnego pakietu"
                  }
                  note={`${usedSessions}/${totalSessions} wykorzystanych · ${remainingSessions} pozostało`}
                  icon={<CreditCard size={18} />}
                />
                <SummaryCard
                  label="Przyszłe sesje"
                  value={String(futureSessions.length)}
                  note={
                    futureSessions.length
                      ? "Zaplanowane sesje nie zostaną przeniesione ani anulowane."
                      : "Brak przyszłych sesji."
                  }
                  icon={<CalendarClock size={18} />}
                />
                <SummaryCard
                  label="Do rozliczenia"
                  value={formatMoney(amountDue, currency)}
                  note={
                    currentBalance > 0
                      ? `Nadpłata klienta: ${formatMoney(
                          currentBalance,
                          currency,
                        )}`
                      : `Saldo klienta: ${formatMoney(currentBalance, currency)}`
                  }
                  icon={<CreditCard size={18} />}
                />
                <SummaryCard
                  label="Odnowienie"
                  value={getRenewalLabel(subscription)}
                  note={
                    subscription?.cancelRenewalRequested
                      ? "Zgłoszono wyłączenie odnowienia."
                      : "Stan odnowienia nie jest zmieniany przez ten ekran."
                  }
                  icon={<Repeat2 size={18} />}
                />
              </div>

              <div className="mt-5 rounded-[var(--radius-lg)] bg-error-container/25 p-4 text-sm leading-6 text-on-surface-variant">
                Zakończenie współpracy jest obecnie niedostępne. Ten ekran
                pokazuje tylko podsumowanie. Pakiet, płatności, treningi,
                dostęp do panelu i kartoteka pozostają bez zmian.
              </div>
            </>
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
          <Button type="button" variant="danger" disabled>
            Zakończenie współpracy niedostępne
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label text-on-surface-muted">{label}</p>
        <span className="text-primary-light">{icon}</span>
      </div>
      <p className="mt-3 text-lg font-semibold text-on-surface">{value}</p>
      <p className="mt-2 text-xs leading-5 text-on-surface-muted">{note}</p>
    </div>
  );
}

function getRenewalLabel(subscription: ClientSubscription | null) {
  if (!subscription) return "Brak danych";
  if (subscription.cancelRenewalRequested) return "Wyłączenie zgłoszone";
  return subscription.autoRenewEnabled ? "Aktywne" : "Wyłączone";
}

function isFutureSession(session: OwnerSession) {
  const status = (session.status || "").toLowerCase();
  const cancelled =
    status.includes("cancel") ||
    status.includes("anul") ||
    status.includes("odwoł");

  return !cancelled && new Date(session.startAt).getTime() > Date.now();
}
