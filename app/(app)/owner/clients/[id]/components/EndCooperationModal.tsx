"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CreditCard, ShieldAlert } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { OwnerTextArea } from "../../../components/OwnerFormControls";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";
import { formatMoney } from "@/app/lib/formatters/money";
import type {
  ClientClosurePackage,
  ClientClosurePreview,
  CloseCooperationPayload,
} from "@/app/lib/owner/clients";

type PackageDecision = {
  disposition: "" | "Retain" | "Refund";
  refundAmount: string;
};

const blockerLabels: Record<string, string> = {
  FutureSessions: "Klient ma przyszłe lub trwające sesje.",
  UnfinishedSessions: "Zakończ rozliczanie wcześniejszych treningów.",
  PendingPayments: "Wyjaśnij płatności oczekujące na potwierdzenie.",
  UnpaidPackages: "Klient ma nieopłacony w całości pakiet.",
  OutstandingBalance: "Pozostało nierozliczone saldo korekt lub nadpłat.",
  PendingRefunds: "Potwierdź wykonanie uzgodnionego zwrotu.",
};

export default function EndCooperationModal({
  open,
  loading,
  submitting,
  preview,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  submitting: boolean;
  preview: ClientClosurePreview | null;
  onClose: () => void;
  onSubmit: (payload: CloseCooperationPayload) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [decisions, setDecisions] = useState<Record<number, PackageDecision>>(
    {},
  );
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!open || !preview) return;

    setReason("");
    setValidationMessage("");
    setDecisions(
      Object.fromEntries(
        preview.packages
          .filter((item) => item.requiresDecision)
          .map((item) => [
            item.clientPackageId,
            {
              disposition: "",
              refundAmount: "",
            },
          ]),
      ),
    );
  }, [open, preview]);

  const decisionPackages = useMemo(
    () => preview?.packages.filter((item) => item.requiresDecision) || [],
    [preview],
  );
  const hasBlockers = Boolean(preview?.blockers.length);

  if (!open) return null;

  async function handleSubmit() {
    if (!preview) return;

    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length > 1000) {
      setValidationMessage("Podaj powód zakończenia współpracy (1–1000 znaków).");
      return;
    }

    const packagePayload: CloseCooperationPayload["packages"] = [];

    for (const packageData of decisionPackages) {
      const decision = decisions[packageData.clientPackageId];
      if (!decision?.disposition) {
        setValidationMessage(
          `Wybierz sposób rozliczenia pakietu „${packageData.name}”.`,
        );
        return;
      }

      const refundAmount =
        decision.disposition === "Refund"
          ? parseRefundAmount(decision.refundAmount)
          : 0;

      if (
        decision.disposition === "Refund" &&
        (!isValidRefundAmount(decision.refundAmount) ||
          refundAmount <= 0 ||
          refundAmount > packageData.amountPaid)
      ) {
        setValidationMessage(
          `Podaj prawidłową kwotę zwrotu dla pakietu „${packageData.name}”. Maksymalnie ${formatMoney(
            packageData.amountPaid,
            packageData.currency,
          )}.`,
        );
        return;
      }

      packagePayload.push({
        clientPackageId: packageData.clientPackageId,
        disposition: decision.disposition,
        refundAmount,
      });
    }

    setValidationMessage("");
    await onSubmit({ reason: cleanReason, packages: packagePayload });
  }

  return (
    <ModalOverlay
      onClose={submitting ? undefined : onClose}
      className="px-4 py-8"
    >
      <div className="relative z-10 flex max-h-full w-full max-w-[760px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <ModalHeader
            eyebrow="Zakończenie współpracy"
            title="Rozliczenie klienta"
            description="Sprawdź, czy wszystkie sprawy są uporządkowane, i wybierz sposób rozliczenia pozostałych pakietów."
            icon={<ShieldAlert size={20} />}
            iconTone="danger"
            onClose={submitting ? () => undefined : onClose}
          />

          {loading ? (
            <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
              Sprawdzamy aktualny stan współpracy...
            </div>
          ) : preview ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <SummaryCard
                  label="Saldo"
                  value={formatPreviewBalance(preview)}
                  note="Aktualne saldo rozliczeń klienta"
                />
                <SummaryCard
                  label="Przyszłe sesje"
                  value={String(preview.futureSessionIds.length)}
                  note="Sesje nie zostaną automatycznie odwołane ani zmienione"
                />
              </div>

              {hasBlockers ? (
                <section className="mt-5 rounded-[var(--radius-lg)] bg-error-container/25 p-4">
                  <div className="flex items-center gap-2 text-error-light">
                    <AlertTriangle size={18} />
                    <h3 className="font-semibold">Najpierw uporządkuj te sprawy</h3>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2 text-sm text-on-surface-variant">
                    {preview.blockers.map((blocker) => (
                      <li key={blocker}>
                        {blockerLabels[blocker] ||
                          "Nie można jeszcze zakończyć współpracy."}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="mt-6">
                <h3 className="text-section-title">Pakiety klienta</h3>
                <div className="mt-3 flex flex-col gap-3">
                  {preview.packages.length ? (
                    preview.packages.map((packageData) => (
                      <ClosurePackageDecision
                        key={packageData.clientPackageId}
                        packageData={packageData}
                        decision={decisions[packageData.clientPackageId]}
                        disabled={submitting || hasBlockers}
                        onChange={(decision) =>
                          setDecisions((current) => ({
                            ...current,
                            [packageData.clientPackageId]: decision,
                          }))
                        }
                      />
                    ))
                  ) : (
                    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
                      Brak pakietów wymagających rozliczenia.
                    </div>
                  )}
                </div>
              </section>

              <OwnerTextArea
                label="Powód zakończenia współpracy"
                value={reason}
                onChange={setReason}
                minLength={1}
                maxLength={1000}
                required
                rows={3}
                disabled={submitting || hasBlockers}
                placeholder="Np. Zakończenie współpracy na prośbę klienta"
                className="mt-6 block"
              />
              <p className="mt-1 text-right text-xs text-on-surface-muted">
                {reason.length}/1000
              </p>

              {validationMessage ? (
                <p className="mt-4 rounded-[var(--radius-lg)] bg-error-container/30 px-4 py-3 text-sm text-error-light">
                  {validationMessage}
                </p>
              ) : null}
            </>
          ) : (
            <div className="mt-6 rounded-[var(--radius-lg)] bg-error-container/25 p-5 text-sm text-on-surface-variant">
              Nie udało się sprawdzić stanu współpracy. Zamknij okno i spróbuj
              ponownie.
            </div>
          )}
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
          <Button
            type="button"
            variant="danger"
            onClick={handleSubmit}
            disabled={loading || submitting || !preview || hasBlockers}
          >
            {submitting ? "Kończenie współpracy..." : "Zakończ współpracę"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}

function ClosurePackageDecision({
  packageData,
  decision,
  disabled,
  onChange,
}: {
  packageData: ClientClosurePackage;
  decision?: PackageDecision;
  disabled: boolean;
  onChange: (decision: PackageDecision) => void;
}) {
  const currentDecision = decision || { disposition: "", refundAmount: "" };

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-on-surface">{packageData.name}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Pozostałe wejścia: {packageData.remainingSessions}
          </p>
        </div>
        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-semibold text-primary-light">
          {packageData.requiresDecision
            ? "Wymaga decyzji"
            : getDispositionLabel(packageData.disposition)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-sm">
        <div>
          <p className="text-label text-on-surface-muted">Zapłacono</p>
          <p className="mt-1 font-semibold">
            {formatMoney(packageData.amountPaid, packageData.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-label text-on-surface-muted">Do zapłaty</p>
          <p className="mt-1 font-semibold">
            {formatMoney(packageData.amountDue, packageData.currency)}
          </p>
        </div>
      </div>

      {packageData.requiresDecision ? (
        <div className="mt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <DecisionButton
              label="Zachowaj pozostałe wejścia"
              active={currentDecision.disposition === "Retain"}
              disabled={disabled}
              onClick={() =>
                onChange({ disposition: "Retain", refundAmount: "" })
              }
            />
            <DecisionButton
              label="Zwrot"
              active={currentDecision.disposition === "Refund"}
              disabled={disabled}
              onClick={() =>
                onChange({
                  disposition: "Refund",
                  refundAmount: currentDecision.refundAmount,
                })
              }
            />
          </div>

          {currentDecision.disposition === "Refund" ? (
            <label className="mt-3 block">
              <span className="text-label text-on-surface-muted">
                Kwota uzgodnionego zwrotu
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={currentDecision.refundAmount}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...currentDecision,
                    refundAmount: event.target.value,
                  })
                }
                placeholder="0,00"
                className="mt-2 h-12 w-full rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-low px-4 text-sm text-on-surface outline-none transition focus:border-primary-light/40"
              />
              <span className="mt-2 block text-xs text-on-surface-muted">
                Maksymalnie{" "}
                {formatMoney(packageData.amountPaid, packageData.currency)}.
                Kwota nie jest wyliczana automatycznie.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function DecisionButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "min-h-12 rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        active
          ? "border-primary-light bg-primary/15 text-primary-light"
          : "border-white/10 bg-surface-container-low text-on-surface-variant hover:border-primary-light/40",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function formatPreviewBalance(preview: ClientClosurePreview) {
  const currencies = Array.from(
    new Set(preview.packages.map((item) => item.currency).filter(Boolean)),
  );

  return currencies.length === 1
    ? formatMoney(preview.balance, currencies[0])
    : preview.balance.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
}

function getDispositionLabel(disposition?: string | null) {
  if (disposition === "Retain") return "Wejścia zachowane";
  if (disposition === "RefundPending") return "Zwrot do potwierdzenia";
  if (disposition === "Refunded") return "Zwrot potwierdzony";
  return "Rozliczony";
}

function parseRefundAmount(value: string) {
  return Number(value.replace(",", "."));
}

function isValidRefundAmount(value: string) {
  return /^\d+(?:[.,]\d{1,2})?$/.test(value.trim());
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label text-on-surface-muted">{label}</p>
        <CreditCard size={18} className="text-primary-light" />
      </div>
      <p className="mt-3 text-lg font-semibold text-on-surface">{value}</p>
      <p className="mt-2 text-xs leading-5 text-on-surface-muted">{note}</p>
    </div>
  );
}
