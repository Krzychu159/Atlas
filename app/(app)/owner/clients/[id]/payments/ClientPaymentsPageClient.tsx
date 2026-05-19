"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  Repeat2,
  RotateCcw,
  WalletCards,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import {
  OwnerTextArea,
  OwnerTextField,
} from "@/app/(app)/owner/components/OwnerFormControls";
import {
  cancelClientSubscription,
  getClient,
  getClientCurrentCycle,
  getClientSubscription,
  getClientSubscriptionUsage,
  resumeClientSubscription,
  setClientNextPackage,
  type Client,
  type ClientSubscription,
  type SubscriptionCycle,
  type SubscriptionUsage,
} from "@/app/lib/owner/clients";
import {
  cancelPaymentReceipt,
  confirmClientPayment,
  createClientPayment,
  getClientActivePackage,
  getClientBilling,
  getClientPayments,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  issuePaymentReceipt,
  isConfirmedPayment,
  isPendingPayment,
  isReceiptIssued,
  isRejectedPayment,
  isReversedPayment,
  paymentMethodOptions,
  reverseClientPayment,
  type ClientBillingSummary,
  type ClientPackageBilling,
  type ClientPayment,
  type PaymentMethod,
} from "@/app/lib/owner/billing";
import { getPackages, type Package } from "@/app/lib/owner/packages";
import {
  showOwnerError,
  showOwnerSuccess,
} from "@/app/(app)/owner/components/owner-toast";

type ClientPaymentsPageClientProps = {
  clientIdParam: string;
};

export default function ClientPaymentsPageClient({
  clientIdParam,
}: ClientPaymentsPageClientProps) {
  const [clientId, setClientId] = useState<number | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(
    null,
  );
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [activePackage, setActivePackage] =
    useState<ClientPackageBilling | null>(null);
  const [currentCycle, setCurrentCycle] = useState<SubscriptionCycle | null>(
    null,
  );
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [hasMorePayments, setHasMorePayments] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [nextPackageId, setNextPackageId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPackageId, setPaymentPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("2");
  const [paymentNote, setPaymentNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(
    null,
  );
  const [paymentToReverse, setPaymentToReverse] =
    useState<ClientPayment | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsedId = Number(clientIdParam);

      if (!parsedId) {
        showOwnerError(new Error("Nieprawidłowe ID klienta."), "", {
          id: "owner-client-payments-invalid-id",
        });
        setIsLoading(false);
        return;
      }

      setClientId(parsedId);
      void loadClientPayments(parsedId);
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdParam]);

  async function loadClientPayments(id = clientId) {
    if (!id) return;

    try {
      setIsLoading(true);
      const [
        clientData,
        billingData,
        subscriptionData,
        packagesData,
        usageData,
        paymentsData,
        activePackageData,
        currentCycleData,
      ] = await Promise.all([
        getClient(id),
        getClientBilling(id),
        getClientSubscription(id),
        getPackages(),
        getClientSubscriptionUsage(id).catch(() => null),
        getClientPayments(id, { page: 1, pageSize: 3 }),
        getClientActivePackage(id).catch(() => null),
        getClientCurrentCycle(id).catch(() => null),
      ]);

      setClient(clientData);
      setBilling(billingData);
      setSubscription(subscriptionData);
      setUsage(usageData);
      setClientPayments(paymentsData.items || []);
      setHasMorePayments(paymentsData.page < paymentsData.totalPages);
      setActivePackage(activePackageData);
      setCurrentCycle(currentCycleData);
      setPackages(packagesData.filter((item) => item.isActive));
      setPaymentAmount(String(Math.max(billingData.activePackageAmountDue, 0)));

      const activeClientPackageId = billingData.activeClientPackageId
        ? String(billingData.activeClientPackageId)
        : "";

      setPaymentPackageId(activeClientPackageId);
      setNextPackageId(
        subscriptionData.nextPackage?.packageId
          ? String(subscriptionData.nextPackage.packageId)
          : "",
      );
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać płatności klienta.", {
        id: "owner-client-payments-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetNextPackage() {
    if (!clientId || !nextPackageId) return;

    try {
      setIsSaving(true);
      const data = await setClientNextPackage(clientId, Number(nextPackageId));
      setSubscription(data);
      showOwnerSuccess("Pakiet od następnego cyklu został ustawiony.", {
        id: "owner-client-next-package-set",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ustawić kolejnego pakietu.", {
        id: "owner-client-next-package-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRequestCancelAfterCycle() {
    if (!clientId || !subscription) return;

    if (subscription.cancelRenewalRequested) {
      showOwnerSuccess("Zakończenie po obecnym cyklu jest już ustawione.", {
        id: "owner-client-cancel-after-cycle-already-set",
      });
      return;
    }

    try {
      setIsSaving(true);
      const data = await cancelClientSubscription(clientId);
      setSubscription({
        ...data,
        autoRenewEnabled: false,
        cancelRenewalRequested: true,
      });
      showOwnerSuccess("Zakończenie po cyklu zostało ustawione.", {
        id: "owner-client-cancel-after-cycle-updated",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ustawić zakończenia po cyklu.", {
        id: "owner-client-cancel-after-cycle-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResumeAutoRenew() {
    if (!clientId || !subscription) return;

    if (!subscription.cancelRenewalRequested) {
      showOwnerSuccess("Auto-przedłużanie jest już aktywne.", {
        id: "owner-client-autorenew-already-active",
      });
      return;
    }

    try {
      setIsSaving(true);
      const data = await resumeClientSubscription(clientId);
      setSubscription({
        ...data,
        autoRenewEnabled: true,
        cancelRenewalRequested: false,
      });
      showOwnerSuccess("Auto-przedłużanie zostało wznowione.", {
        id: "owner-client-autorenew-resumed",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się wznowić auto-przedłużania.", {
        id: "owner-client-autorenew-resume-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreatePayment() {
    if (!clientId) return;

    const amount = Number(paymentAmount.replace(",", "."));
    const selectedPackage = packagesBilling.find(
      (item) => item.clientPackageId === Number(paymentPackageId),
    );

    if (!paymentPackageId) {
      showOwnerError(new Error("Wybierz pakiet, którego dotyczy wpłata."), "", {
        id: "owner-client-payment-package-required",
      });
      return;
    }

    if (!selectedPackage) {
      showOwnerError(new Error("Nie znaleziono wybranego pakietu."), "", {
        id: "owner-client-payment-package-missing",
      });
      return;
    }

    if (!amount || amount <= 0) {
      showOwnerError(new Error("Podaj poprawną kwotę wpłaty."), "", {
        id: "owner-client-payment-amount-invalid",
      });
      return;
    }

    try {
      setIsSaving(true);
      const createdPayment = await createClientPayment({
        clientId,
        clientPackageId: Number(paymentPackageId),
        amount,
        method: Number(paymentMethod) as PaymentMethod,
        paymentDate: new Date().toISOString(),
        note: paymentNote.trim() || "Wpłata dodana w panelu.",
      });

      showOwnerSuccess(getCreatedPaymentMessage(createdPayment), {
        id: "owner-client-payment-created",
      });
      setPaymentNote("");
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się dodać wpłaty.", {
        id: "owner-client-payment-create-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmPayment(payment: ClientPayment) {
    if (!clientId) return;

    if (!isPendingPayment(payment)) {
      showOwnerSuccess("Ta wpłata nie wymaga potwierdzenia.", {
        id: `owner-client-payment-not-pending-${payment.id}`,
      });
      return;
    }

    try {
      setProcessingPaymentId(payment.id);
      await confirmClientPayment(payment.id);
      showOwnerSuccess("Wpłata została potwierdzona.", {
        id: `owner-client-payment-confirmed-${payment.id}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się potwierdzić wpłaty.", {
        id: `owner-client-payment-confirm-error-${payment.id}`,
      });
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleIssueReceipt(payment: ClientPayment) {
    if (!clientId) return;

    try {
      setProcessingPaymentId(payment.id);
      await issuePaymentReceipt(payment.id);
      showOwnerSuccess("Paragon został wystawiony.", {
        id: `owner-client-payment-receipt-issued-${payment.id}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się wystawić paragonu.", {
        id: `owner-client-payment-receipt-issue-error-${payment.id}`,
      });
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleCancelReceipt(payment: ClientPayment) {
    if (!clientId) return;

    try {
      setProcessingPaymentId(payment.id);
      await cancelPaymentReceipt(payment.id);
      showOwnerSuccess("Paragon został cofnięty.", {
        id: `owner-client-payment-receipt-cancelled-${payment.id}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się cofnąć paragonu.", {
        id: `owner-client-payment-receipt-cancel-error-${payment.id}`,
      });
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleReversePayment() {
    if (!clientId || !paymentToReverse) return;

    const reason = reversalReason.trim();

    if (!reason) {
      showOwnerError(new Error("Podaj powód cofnięcia wpłaty."), "", {
        id: "owner-client-payment-reverse-reason-required",
      });
      return;
    }

    try {
      setProcessingPaymentId(paymentToReverse.id);
      await reverseClientPayment(paymentToReverse.id, reason);
      setPaymentToReverse(null);
      setReversalReason("");
      showOwnerSuccess("Wpłata została cofnięta.", {
        id: `owner-client-payment-reversed-${paymentToReverse.id}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się cofnąć wpłaty.", {
        id: `owner-client-payment-reverse-error-${paymentToReverse.id}`,
      });
    } finally {
      setProcessingPaymentId(null);
    }
  }

  function handlePaymentPackageChange(value: string) {
    setPaymentPackageId(value);

    const selectedPackage = packagesBilling.find(
      (item) => item.clientPackageId === Number(value),
    );

    if (selectedPackage) {
      setPaymentAmount(String(Math.max(selectedPackage.amountDue, 0)));
    }
  }

  const packageOptions = useMemo(
    () => [
      { value: "", label: "Wybierz pakiet" },
      ...packages.map((item) => ({
        value: String(item.id),
        label: `${item.name} · ${formatMoney(item.price, item.currency)}`,
      })),
    ],
    [packages],
  );

  const packagesBilling = useMemo(
    () =>
      [...(billing?.packages || [])].sort(
        (first, second) => Number(second.isActive) - Number(first.isActive),
      ),
    [billing?.packages],
  );

  const clientPackageOptions = useMemo(
    () => [
      { value: "", label: "Wybierz pakiet do rozliczenia" },
      ...packagesBilling.map((item) => ({
        value: String(item.clientPackageId),
        label: `${item.packageName || `Pakiet #${item.clientPackageId}`} · ${
          item.amountDue > 0
            ? `${formatMoney(item.amountDue, item.currency)} do zapłaty`
            : "opłacony"
        }`,
      })),
    ],
    [packagesBilling],
  );

  const payments = useMemo(
    () =>
      [...clientPayments].sort(
        (first, second) =>
          new Date(second.paymentDate).getTime() -
          new Date(first.paymentDate).getTime(),
      ),
    [clientPayments],
  );
  const selectedPaymentPackage = packagesBilling.find(
    (item) => item.clientPackageId === Number(paymentPackageId),
  );
  const parsedPaymentAmount = Number(paymentAmount.replace(",", "."));
  const activeAmountDue =
    activePackage?.amountDue ??
    currentCycle?.amountDue ??
    billing?.activePackageAmountDue ??
    0;
  const activeAmountPaid =
    activePackage?.amountPaid ??
    currentCycle?.amountPaid ??
    billing?.activePackageAmountPaid ??
    0;
  const activeCurrency = activePackage?.currency || currentCycle?.currency || "PLN";
  const lastPayment = payments[0] || null;
  const visiblePayments = payments.slice(0, 3);
  const allClientPaymentsHref = clientId
    ? `/owner/payments?clientId=${clientId}`
    : "/owner/payments";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={clientId ? `/owner/clients/${clientId}` : "/owner/clients"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"
          >
            <ArrowLeft size={18} />
            Karta klienta
          </Link>
          <h1 className="mt-4 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Płatności klienta
          </h1>
          <p className="mt-3 text-on-surface-variant">
            {client?.fullName || billing?.clientName || "Ładowanie klienta..."}
          </p>
        </div>

        <Button
          variant="secondary"
          icon={
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          }
          onClick={() => loadClientPayments()}
          disabled={isLoading || !clientId}
        >
          Odśwież
        </Button>
      </div>

      {isLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
          Ładowanie płatności klienta...
        </div>
      ) : null}

      {billing ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <BillingStat
              label="Do zapłaty"
              value={formatMoney(activeAmountDue, activeCurrency)}
              icon={<WalletCards size={18} />}
            />
            <BillingStat
              label="Aktywny pakiet"
              value={
                activePackage?.packageName ||
                currentCycle?.packageName ||
                billing.activePackageName ||
                "Brak"
              }
              icon={<PackagePlus size={18} />}
            />
            <BillingStat
              label="Zapłacono w cyklu"
              value={formatMoney(activeAmountPaid, activeCurrency)}
              icon={<CheckCircle2 size={18} />}
            />
            <BillingStat
              label="Ostatnia wpłata"
              value={
                lastPayment
                  ? formatMoney(lastPayment.amount, lastPayment.currency)
                  : "Brak"
              }
              icon={<ReceiptText size={18} />}
            />
          </section>

          {billing.currentBalance > 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-tertiary-light/20 bg-tertiary-container/20 px-4 py-3 text-sm font-semibold text-tertiary-light">
              Nadpłata klienta zostanie automatycznie odjęta od kolejnego
              pakietu.
            </div>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="card-shell p-4 md:p-5">
              <p className="text-section-title">Dodaj wpłatę</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Wybierz pakiet, a system rozdzieli wpłatę na część rozliczającą
                pakiet i ewentualną nadpłatę na saldo klienta.
              </p>
              <div className="mt-4 grid gap-3">
                <OwnerTextField
                  label="Kwota"
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  inputMode="decimal"
                />
                <CustomSelect
                  label="Pakiet"
                  value={paymentPackageId}
                  onChange={handlePaymentPackageChange}
                  options={clientPackageOptions}
                />
                <PaymentSplitPreview
                  packageBilling={selectedPaymentPackage}
                  amount={parsedPaymentAmount}
                />
                <CustomSelect
                  label="Metoda"
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={paymentMethodOptions}
                />
                <OwnerTextArea
                  label="Notatka"
                  value={paymentNote}
                  onChange={setPaymentNote}
                  rows={3}
                  placeholder="Np. przelew za pakiet 8 treningów"
                />
                <Button
                  icon={<ReceiptText size={16} />}
                  onClick={handleCreatePayment}
                  disabled={
                    isSaving ||
                    !paymentPackageId ||
                    packagesBilling.length === 0 ||
                    !parsedPaymentAmount ||
                    parsedPaymentAmount <= 0
                  }
                >
                  Dodaj wpłatę
                </Button>
              </div>
            </div>

            <div className="card-shell p-4 md:p-5">
              <div className="mb-4">
                <div>
                  <p className="text-section-title">Historia wpłat</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Historia pokazuje pełną kwotę wpłaty oraz podział na pakiet
                    i saldo klienta.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {visiblePayments.length > 0 ? (
                  visiblePayments.map((payment) => (
                    <ClientPaymentRow
                      key={payment.id}
                      payment={payment}
                      processing={processingPaymentId === payment.id}
                      onConfirm={() => handleConfirmPayment(payment)}
                      onIssueReceipt={() => handleIssueReceipt(payment)}
                      onCancelReceipt={() => handleCancelReceipt(payment)}
                      onReverse={() => {
                        setPaymentToReverse(payment);
                        setReversalReason("");
                      }}
                    />
                  ))
                ) : (
                  <EmptyState label="Brak wpłat klienta." />
                )}
                {hasMorePayments ? (
                  <Link
                    href={allClientPaymentsHref}
                    className="inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] border border-secondary px-4 text-sm font-semibold text-primary-light transition hover:border-primary-light hover:bg-surface-container-high"
                  >
                    Pokaż więcej w płatnościach
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <UsageCard usage={usage} />

            <SubscriptionPanel
              billing={billing}
              subscription={subscription}
              activePackage={activePackage}
              currentCycle={currentCycle}
              nextPackageId={nextPackageId}
              packageOptions={packageOptions}
              isSaving={isSaving}
              onNextPackageChange={setNextPackageId}
              onSetNextPackage={handleSetNextPackage}
              onCancelAfterCycle={handleRequestCancelAfterCycle}
              onResumeAutoRenew={handleResumeAutoRenew}
            />
          </section>
        </>
      ) : null}

      {paymentToReverse ? (
        <ReversePaymentModal
          payment={paymentToReverse}
          reason={reversalReason}
          processing={processingPaymentId === paymentToReverse.id}
          onReasonChange={setReversalReason}
          onClose={() => {
            setPaymentToReverse(null);
            setReversalReason("");
          }}
          onConfirm={handleReversePayment}
        />
      ) : null}
    </div>
  );
}

function SubscriptionPanel({
  billing,
  subscription,
  activePackage,
  currentCycle,
  nextPackageId,
  packageOptions,
  isSaving,
  onNextPackageChange,
  onSetNextPackage,
  onCancelAfterCycle,
  onResumeAutoRenew,
}: {
  billing: ClientBillingSummary;
  subscription: ClientSubscription | null;
  activePackage: ClientPackageBilling | null;
  currentCycle: SubscriptionCycle | null;
  nextPackageId: string;
  packageOptions: Array<{ value: string; label: string }>;
  isSaving: boolean;
  onNextPackageChange: (value: string) => void;
  onSetNextPackage: () => void;
  onCancelAfterCycle: () => void;
  onResumeAutoRenew: () => void;
}) {
  const cancelRequested = Boolean(subscription?.cancelRenewalRequested);
  const willRenew = Boolean(subscription?.autoRenewEnabled && !cancelRequested);
  const cycle = currentCycle || subscription?.currentCycle || null;
  const activePackageName =
    activePackage?.packageName ||
    cycle?.packageName ||
    billing.activePackageName ||
    "Brak aktywnego pakietu";
  const amountDue =
    activePackage?.amountDue ?? cycle?.amountDue ?? billing.activePackageAmountDue;
  const amountPaid =
    activePackage?.amountPaid ?? cycle?.amountPaid ?? billing.activePackageAmountPaid;
  const currency = activePackage?.currency || cycle?.currency || "PLN";
  const totalSessions =
    activePackage?.totalSessions ?? cycle?.totalSessions ?? 0;
  const usedSessions = activePackage?.usedSessions ?? cycle?.usedSessions ?? 0;
  const progress = totalSessions
    ? Math.min(100, Math.round((usedSessions / totalSessions) * 100))
    : 0;
  const nextPackageName =
    subscription?.nextPackage?.packageName || "Nie ustawiono";
  const nextPackagePrice = subscription?.nextPackage
    ? formatMoney(
        subscription.nextPackage.price,
        subscription.nextPackage.currency,
      )
    : "";

  return (
    <section className="card-shell p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-section-title">Subskrypcja klienta</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Aktualny cykl pokazuje pakiet używany teraz. Następny cykl mówi,
            co system ma zrobić po zakończeniu obecnego pakietu.
          </p>
        </div>
        <StatusPill label={subscription?.status || "Brak statusu"} muted />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-low p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label text-on-surface-muted">Aktualny cykl</p>
              <h3 className="mt-2 text-xl font-semibold text-on-surface">
                {activePackageName}
              </h3>
            </div>
            <StatusPill
              label={cycle?.paymentStatus || billing.activePackagePaymentStatus || "Status"}
              muted
            />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-tertiary-light"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <SmallMetric label="Wejścia" value={`${usedSessions}/${totalSessions}`} />
            <SmallMetric label="Zapłacono" value={formatMoney(amountPaid, currency)} />
            <SmallMetric label="Do zapłaty" value={formatMoney(amountDue, currency)} />
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-low p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label text-on-surface-muted">Następny cykl</p>
              <h3 className="mt-2 text-xl font-semibold text-on-surface">
                {willRenew ? nextPackageName : "Nie odnowi się"}
              </h3>
            </div>
            <StatusPill
              label={willRenew ? "Odnowienie" : "Zakończenie"}
              muted={!willRenew}
            />
          </div>
          <p className="mt-3 text-sm leading-5 text-on-surface-variant">
            {willRenew
              ? `Po zakończeniu obecnego cyklu system utworzy kolejny pakiet${
                  nextPackagePrice ? ` (${nextPackagePrice})` : ""
                }.`
              : "Klient kończy obecny cykl, ale kolejny pakiet nie zostanie automatycznie utworzony."}
          </p>
          <div className="mt-4">
            {willRenew ? (
              <Button
                variant="outline"
                onClick={onCancelAfterCycle}
                disabled={isSaving || !subscription}
              >
                Zakończ po cyklu
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={onResumeAutoRenew}
                disabled={isSaving || !subscription}
              >
                Włącz auto-przedłużanie
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
          <CustomSelect
            label="Pakiet od następnego cyklu"
            value={nextPackageId}
            onChange={onNextPackageChange}
            options={packageOptions}
          />
          <Button
            variant="secondary"
            icon={<Repeat2 size={16} />}
            onClick={onSetNextPackage}
            disabled={isSaving || !nextPackageId}
            className="w-full xl:w-auto"
          >
            Ustaw następny pakiet
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-on-surface-muted">
          To nie zmienia aktualnego pakietu. Wybór działa dopiero przy odnowieniu
          subskrypcji na kolejny cykl.
        </p>
      </div>
    </section>
  );
}

function PaymentSplitPreview({
  packageBilling,
  amount,
}: {
  packageBilling?: ClientPackageBilling;
  amount: number;
}) {
  if (!packageBilling) {
    return (
      <p className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2 text-xs text-on-surface-muted">
        Wybierz pakiet, żeby przypisać wpłatę do konkretnego cyklu
        rozliczeniowego.
      </p>
    );
  }

  if (!amount || amount <= 0) {
    return (
      <p className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2 text-xs text-on-surface-muted">
        Wpisz kwotę, żeby zobaczyć podział wpłaty.
      </p>
    );
  }

  const due = Math.max(packageBilling.amountDue, 0);
  const appliedToPackage = Math.min(amount, due);
  const balanceCredit = Math.max(amount - due, 0);

  return (
    <div className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2 text-xs text-on-surface-muted">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <PaymentPreviewMetric
          label="Na pakiet"
          value={formatMoney(appliedToPackage, packageBilling.currency)}
        />
        <PaymentPreviewMetric
          label="Na saldo"
          value={
            balanceCredit > 0
              ? `+${formatMoney(balanceCredit, packageBilling.currency)}`
              : formatMoney(balanceCredit, packageBilling.currency)
          }
          accent={balanceCredit > 0}
        />
        <PaymentPreviewMetric
          label="Do zapłaty"
          value={formatMoney(due, packageBilling.currency)}
        />
      </div>
      {balanceCredit > 0 ? (
        <p className="mt-2 font-semibold text-tertiary-light">
          Nadpłata zasili saldo klienta i obniży kolejny pakiet.
        </p>
      ) : null}
    </div>
  );
}

function PaymentPreviewMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-semibold",
          accent ? "text-tertiary-light" : "text-on-surface",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function BillingStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-shell flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-label text-on-surface-muted">{label}</p>
        <p className="mt-3 truncate text-xl font-semibold text-on-surface">
          {value}
        </p>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
        {icon}
      </div>
    </div>
  );
}

function UsageCard({ usage }: { usage: SubscriptionUsage | null }) {
  const [showAllSessions, setShowAllSessions] = useState(false);
  const totalSessions = usage?.totalSessions || 0;
  const usedSessions = usage?.usedSessions || 0;
  const progress = totalSessions
    ? Math.min(100, Math.round((usedSessions / totalSessions) * 100))
    : 0;
  const allSessions = [...(usage?.sessions || [])].sort(
    (first, second) =>
      new Date(second.date).getTime() - new Date(first.date).getTime(),
  );
  const sessions = showAllSessions ? allSessions : allSessions.slice(0, 3);
  const hiddenSessionsCount = Math.max(allSessions.length - sessions.length, 0);

  return (
    <section className="card-shell p-4 md:p-5">
      <p className="text-section-title">Wykorzystanie cyklu</p>
      {usage?.clientPackageId ? (
        <>
          <div className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-label text-on-surface-muted">
                  Użyte wejścia
                </p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">
                  {usedSessions}/{totalSessions}
                </p>
              </div>
              <p className="text-sm font-semibold text-tertiary-light">
                zostało {usage.remainingSessions}
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-tertiary-light"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <SmallMetric
              label="Planowany typ"
              value={usage.expectedBillingType || "Brak"}
            />
            <SmallMetric
              label="Inny typ"
              value={String(usage.differentThanExpectedCount)}
            />
            <SmallMetric
              label="Suma korekt"
              value={formatMoney(usage.adjustmentsTotal, "PLN")}
            />
          </div>

          {sessions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label text-on-surface-muted">
                  Różnice w cyklu
                </p>
                <p className="text-xs font-semibold text-on-surface-muted">
                  {sessions.length} z {allSessions.length}
                </p>
              </div>
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-on-surface">
                      {formatDate(session.date)}
                    </p>
                    <p className="text-xs text-on-surface-muted">
                      {formatMoney(session.balanceDifference, "PLN")}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Plan: {session.plannedBillingType || "brak"} · Faktycznie:{" "}
                    {session.actualBillingType || "faktycznie"}
                  </p>
                </div>
              ))}
              {allSessions.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllSessions((current) => !current)}
                  className="mt-1 h-10 rounded-[var(--radius-md)] border border-secondary px-3 text-xs font-semibold text-primary-light transition hover:border-primary-light hover:bg-surface-container-high"
                >
                  {showAllSessions
                    ? "Pokaż mniej"
                    : `Pokaż wszystkie (${hiddenSessionsCount} więcej)`}
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState label="Brak aktywnego cyklu do policzenia wykorzystania." />
      )}
    </section>
  );
}

function ClientPaymentRow({
  payment,
  processing,
  onConfirm,
  onIssueReceipt,
  onCancelReceipt,
  onReverse,
}: {
  payment: ClientPayment;
  processing: boolean;
  onConfirm: () => void;
  onIssueReceipt: () => void;
  onCancelReceipt: () => void;
  onReverse: () => void;
}) {
  const pending = isPendingPayment(payment);
  const confirmed = isConfirmedPayment(payment);
  const rejected = isRejectedPayment(payment);
  const reversed = isReversedPayment(payment);
  const hasOverpayment = payment.balanceCreditAmount > 0;
  const receiptIssued = isReceiptIssued(payment);

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-on-surface">
              {formatMoney(payment.amount, payment.currency)}
            </p>
            <StatusPill
              label={getPaymentStatusLabel(payment.status)}
              muted={!confirmed && !pending && !rejected}
            />
            {hasOverpayment ? <StatusPill label="Nadpłata" /> : null}
            {receiptIssued ? <StatusPill label="Paragon" muted /> : null}
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {payment.packageName || "Bez przypisanego pakietu"} ·{" "}
            {formatDate(payment.paymentDate)}
          </p>
          {payment.note ? (
            <p className="mt-2 line-clamp-2 text-xs text-on-surface-muted">
              {payment.note}
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-2">
          <p className="text-label text-on-surface-muted">Rozliczenie</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <PaymentSplitItem
              label="Wpłata"
              value={formatMoney(payment.amount, payment.currency)}
            />
            <PaymentSplitItem
              label="Pakiet"
              value={formatMoney(
                payment.appliedToPackageAmount,
                payment.currency,
              )}
            />
            <PaymentSplitItem
              label="Saldo"
              value={
                payment.balanceCreditAmount > 0
                  ? `+${formatMoney(payment.balanceCreditAmount, payment.currency)}`
                  : formatMoney(payment.balanceCreditAmount, payment.currency)
              }
              accent={payment.balanceCreditAmount > 0}
            />
            <PaymentSplitItem
              label="Metoda"
              value={getPaymentMethodLabel(payment.method)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {pending ? (
            <Button
              size="sm"
              icon={<CheckCircle2 size={15} />}
              onClick={onConfirm}
              disabled={processing}
            >
              Potwierdź
            </Button>
          ) : null}
          {confirmed && !reversed ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={<ReceiptText size={15} />}
                onClick={receiptIssued ? onCancelReceipt : onIssueReceipt}
                disabled={processing}
              >
                {receiptIssued ? "Cofnij paragon" : "Wystaw paragon"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<RotateCcw size={15} />}
                onClick={onReverse}
                disabled={processing}
              >
                Cofnij
              </Button>
            </>
          ) : null}
          {!pending && !confirmed ? (
            <StatusPill
              label={getPaymentStatusLabel(payment.status)}
              muted={!rejected && !reversed}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PaymentSplitItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-on-surface-muted">
      {label}:{" "}
      <strong className={accent ? "text-tertiary-light" : "text-on-surface"}>
        {value}
      </strong>
    </span>
  );
}

function ReversePaymentModal({
  payment,
  reason,
  processing,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  payment: ClientPayment;
  reason: string;
  processing: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[560px] rounded-[var(--radius-xl)] border border-white/8 bg-surface-container p-5 shadow-ambient">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">Cofnięcie wpłaty</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-surface">
              {formatMoney(payment.amount, payment.currency)}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {payment.packageName || "Bez przypisanego pakietu"} ·{" "}
              {formatDate(payment.paymentDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-muted transition hover:text-on-surface"
          >
            ×
          </button>
        </div>

        <OwnerTextArea
          label="Powód cofnięcia"
          value={reason}
          onChange={onReasonChange}
          rows={4}
          className="mt-5"
          placeholder="Np. błędnie zaksięgowana wpłata."
        />

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Anuluj
          </Button>
          <Button
            variant="danger"
            icon={<RotateCcw size={16} />}
            onClick={onConfirm}
            disabled={processing}
          >
            Cofnij wpłatę
          </Button>
        </div>
      </div>
    </div>
  );
}

function getCreatedPaymentMessage(payment: ClientPayment) {
  if (isPendingPayment(payment)) {
    return "Wpłata została dodana i oczekuje na potwierdzenie.";
  }

  if (isConfirmedPayment(payment)) {
    if (payment.balanceCreditAmount > 0) {
      return `Wpłata rozliczona: ${formatMoney(
        payment.appliedToPackageAmount,
        payment.currency,
      )} na pakiet i ${formatMoney(
        payment.balanceCreditAmount,
        payment.currency,
      )} na saldo.`;
    }

    return "Wpłata została dodana i rozliczona.";
  }

  return "Wpłata została dodana.";
}

function StatusPill({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        muted
          ? "bg-surface-container text-on-surface-muted"
          : "bg-tertiary-light/15 text-tertiary-light",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-6 text-center text-on-surface-variant">
      {label}
    </div>
  );
}

function formatMoney(amount: number, currency?: string | null) {
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Brak daty";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
