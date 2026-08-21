"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentEntryModal } from "@/app/components/payments/PaymentEntryModal";
import { PaymentOperationRow } from "@/app/components/payments/PaymentDisplay";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { getPaymentBreakdown } from "@/app/lib/payments/display";
import {
  cancelClientSubscription,
  getClient,
  getClientCurrentCycle,
  getClientSubscription,
  getClientSubscriptionUsage,
  resumeClientSubscription,
  type Client,
  type ClientSubscription,
  type SubscriptionCycle,
  type SubscriptionUsage,
} from "@/app/lib/owner/clients";
import {
  activateClientPackage,
  cancelPaymentReceipt,
  confirmClientPayment,
  createClientPackage,
  createClientPayment,
  getClientActivePackage,
  getClientBilling,
  getClientPayments,
  issuePaymentReceipt,
  isConfirmedPayment,
  isPendingPayment,
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
import {
  cancelTrainerPortalClientSubscription,
  confirmTrainerPortalPayment,
  createTrainerPortalClientPayment,
  getTrainerPortalClient,
  getTrainerPortalClientBilling,
  getTrainerPortalClientSubscription,
  getTrainerPortalClientSubscriptionUsage,
  getTrainerPortalMe,
  resumeTrainerPortalClientSubscription,
} from "@/app/lib/trainer/portal";
import { trainerPortalClientToClient } from "@/app/lib/trainer/portal-mappers";

type ClientPaymentsPageClientProps = {
  clientIdParam: string;
  basePath?: "/owner" | "/trainer";
};

type PaymentAction = "confirm" | "issueReceipt" | "cancelReceipt";

export default function ClientPaymentsPageClient({
  clientIdParam,
  basePath = "/owner",
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
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPackageId, setPaymentPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("2");
  const [paymentNote, setPaymentNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(
    null,
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] =
    useState<ClientPayment | null>(null);
  const [paymentAction, setPaymentAction] = useState<{
    type: PaymentAction;
    payment: ClientPayment;
  } | null>(null);
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
      if (basePath === "/trainer") {
        await loadTrainerClientPayments(id);
        return;
      }

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
      setPackages(
        packagesData.filter(
          (item) =>
            item.isActive &&
            packageMatchesClientLocation(item, clientData.locationId),
        ),
      );
      setPaymentAmount(String(Math.max(billingData.activePackageAmountDue, 0)));

      const activeClientPackageId = billingData.activeClientPackageId
        ? String(billingData.activeClientPackageId)
        : "";

      setPaymentPackageId(activeClientPackageId);
      setSelectedPackageId("");
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać płatności klienta.", {
        id: "owner-client-payments-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTrainerClientPayments(id: number) {
    const [
      meData,
      clientData,
      billingData,
      subscriptionData,
      usageData,
      packagesData,
    ] =
      await Promise.all([
        getTrainerPortalMe().catch(() => null),
        getTrainerPortalClient(id),
        getTrainerPortalClientBilling(id),
        getTrainerPortalClientSubscription(id),
        getTrainerPortalClientSubscriptionUsage(id).catch(() => null),
        getPackages().catch(() => []),
      ]);
    const activeClientPackageId = billingData.activeClientPackageId
      ? String(billingData.activeClientPackageId)
      : "";
    const activePackageData =
      billingData.packages?.find(
        (item) => item.clientPackageId === billingData.activeClientPackageId,
      ) || null;

    const mappedClient = trainerPortalClientToClient(clientData, meData);

    setClient(mappedClient);
    setBilling(billingData);
    setSubscription(subscriptionData);
    setUsage(usageData);
    setClientPayments((billingData.payments || []).slice(0, 3));
    setHasMorePayments((billingData.payments?.length || 0) > 3);
    setActivePackage(activePackageData);
    setCurrentCycle(subscriptionData.currentCycle || null);
    setPackages(
      packagesData.filter(
        (item) =>
          item.isActive &&
          packageMatchesClientLocation(item, mappedClient.locationId),
      ),
    );
    setPaymentAmount(String(Math.max(billingData.activePackageAmountDue, 0)));
    setPaymentPackageId(activeClientPackageId);
    setSelectedPackageId("");
  }

  async function handleAssignPackage() {
    if (!clientId || !selectedPackageId || basePath !== "/owner") return;

    const selectedPackage = packages.find(
      (item) => item.id === Number(selectedPackageId),
    );

    if (!selectedPackage) {
      showOwnerError(new Error("Wybierz pakiet z lokalizacji klienta."), "", {
        id: "owner-client-package-location-required",
      });
      return;
    }

    try {
      setIsSaving(true);
      const existingPackageIds = new Set(
        (billing?.packages || []).map((item) => item.clientPackageId),
      );
      const purchaseDate = new Date();
      const validUntil = new Date(purchaseDate);

      validUntil.setDate(validUntil.getDate() + selectedPackage.durationDays);

      await createClientPackage({
        clientId,
        packageId: selectedPackage.id,
        name: selectedPackage.name,
        totalSessions: selectedPackage.sessionsLimit,
        totalPrice: selectedPackage.price,
        expectedBillingType: selectedPackage.billingType || 1,
        purchaseDate: purchaseDate.toISOString(),
        validUntil: validUntil.toISOString(),
        paymentDueDate: null,
      });

      const refreshedBilling = await getClientBilling(clientId);
      const createdPackage = (refreshedBilling.packages || [])
        .filter(
          (item) =>
            item.packageId === selectedPackage.id &&
            !existingPackageIds.has(item.clientPackageId),
        )
        .sort((first, second) => second.clientPackageId - first.clientPackageId)[0];

      if (createdPackage && !createdPackage.isActive) {
        await activateClientPackage(clientId, createdPackage.clientPackageId);
      }

      await loadClientPayments(clientId);
      showOwnerSuccess("Pakiet klienta został ustawiony.", {
        id: "owner-client-package-set",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ustawić pakietu klienta.", {
        id: "owner-client-package-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRequestCancelAfterCycle() {
    if (!clientId || !subscription) return;

    if (subscription.cancelRenewalRequested) {
      showOwnerSuccess("Zakończenie po obecnym pakiecie jest już ustawione.", {
        id: "owner-client-cancel-after-cycle-already-set",
      });
      return;
    }

    try {
      setIsSaving(true);
      const data =
        basePath === "/trainer"
          ? await cancelTrainerPortalClientSubscription(clientId)
          : await cancelClientSubscription(clientId);
      setSubscription({
        ...data,
        autoRenewEnabled: false,
        cancelRenewalRequested: true,
      });
      showOwnerSuccess("Zakończenie po pakiecie zostało ustawione.", {
        id: "owner-client-cancel-after-cycle-updated",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ustawić zakończenia po pakiecie.", {
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
      const data =
        basePath === "/trainer"
          ? await resumeTrainerPortalClientSubscription(clientId)
          : await resumeClientSubscription(clientId);
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
      const paymentPayload = {
        clientId,
        clientPackageId: Number(paymentPackageId),
        amount,
        method: Number(paymentMethod) as PaymentMethod,
        paymentDate: new Date().toISOString(),
        note: paymentNote.trim() || "Wpłata dodana w panelu.",
      };
      const createdPayment =
        basePath === "/trainer"
          ? await createTrainerPortalClientPayment(clientId, paymentPayload)
          : await createClientPayment(paymentPayload);

      showOwnerSuccess(getCreatedPaymentMessage(createdPayment), {
        id: "owner-client-payment-created",
      });
      setPaymentNote("");
      setIsPaymentModalOpen(false);
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
      if (basePath === "/trainer") {
        await confirmTrainerPortalPayment(payment.id);
      } else {
        await confirmClientPayment(payment.id);
      }
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
      ...packagesBilling.map((item) => ({
        value: String(item.clientPackageId),
        label: `${item.packageName || `Pakiet #${item.clientPackageId}`} · ${
          item.amountDue > 0
            ? `${formatMoney(item.amountDue, item.currency)} do zapłaty`
            : "opłacony"
        }`,
        amountDue: item.amountDue,
        currency: item.currency,
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
  const hasActiveClientPackage = Boolean(
    activePackage?.isActive ||
      currentCycle?.isActive ||
      billing?.activeClientPackageId,
  );
  const lastPayment = payments[0] || null;
  const visiblePayments = payments.slice(0, 3);
  const allClientPaymentsHref = clientId
    ? `${basePath}/payments?clientId=${clientId}`
    : `${basePath}/payments`;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={clientId ? `${basePath}/clients/${clientId}` : `${basePath}/clients`}
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
              label="Zapłacono za pakiet"
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

          <section className="grid gap-5">
            <div className="card-shell flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
              <div>
                <p className="text-section-title">Wpłaty klienta</p>
                <p className="mt-2 max-w-[720px] text-sm leading-6 text-on-surface-variant">
                  Dodaj wpłatę do konkretnego pakietu. Jeśli kwota jest większa
                  niż należność za pakiet, nadpłata przejdzie na saldo klienta.
                </p>
                {!packagesBilling.length ? (
                  <p className="mt-3 text-sm font-semibold text-warning-light">
                    Najpierw przypisz klientowi pakiet, żeby dodać wpłatę.
                  </p>
                ) : null}
              </div>
              <Button
                size="lg"
                icon={<ReceiptText size={17} />}
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={isSaving || packagesBilling.length === 0}
                className="w-full md:w-auto"
              >
                Dodaj wpłatę
              </Button>
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
                    <PaymentOperationRow
                      key={payment.id}
                      payment={payment}
                      processing={processingPaymentId === payment.id}
                      showActions
                      showClient={false}
                      onConfirm={() =>
                        setPaymentAction({ type: "confirm", payment })
                      }
                      onIssueReceipt={() =>
                        setPaymentAction({ type: "issueReceipt", payment })
                      }
                      onCancelReceipt={() =>
                        setPaymentAction({ type: "cancelReceipt", payment })
                      }
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

          <section
            className={
              hasActiveClientPackage
                ? "grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"
                : "grid gap-5"
            }
          >
            {hasActiveClientPackage ? <UsageCard usage={usage} /> : null}

            <SubscriptionPanel
              billing={billing}
              subscription={subscription}
              activePackage={activePackage}
              currentCycle={currentCycle}
              selectedPackageId={selectedPackageId}
              packageOptions={packageOptions}
              clientLocationName={client?.locationName || "lokalizacji klienta"}
              canAssignPackage={basePath === "/owner"}
              isSaving={isSaving}
              onPackageChange={setSelectedPackageId}
              onAssignPackage={handleAssignPackage}
              onCancelAfterCycle={handleRequestCancelAfterCycle}
              onResumeAutoRenew={handleResumeAutoRenew}
            />
          </section>
        </>
      ) : null}

      <PaymentEntryModal
        open={isPaymentModalOpen}
        eyebrow="Wpłata klienta"
        title="Dodaj wpłatę"
        description="Wybierz pakiet i wpisz kwotę. Nadpłata zostanie automatycznie przeniesiona na saldo klienta."
        amount={paymentAmount}
        packageId={paymentPackageId}
        method={paymentMethod}
        note={paymentNote}
        packageOptions={clientPackageOptions}
        methodOptions={paymentMethodOptions}
        isSubmitting={isSaving}
        submitLabel="Dodaj wpłatę"
        submittingLabel="Dodawanie..."
        emptyPackagesMessage="Klient nie ma pakietu, do którego można przypisać wpłatę."
        notePlaceholder="Np. przelew za pakiet 8 treningów"
        onAmountChange={setPaymentAmount}
        onPackageChange={handlePaymentPackageChange}
        onMethodChange={setPaymentMethod}
        onNoteChange={setPaymentNote}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleCreatePayment}
      />

      {paymentAction ? (
        <PaymentActionConfirmModal
          payment={paymentAction.payment}
          processing={processingPaymentId === paymentAction.payment.id}
          {...getPaymentActionModalCopy(paymentAction.type)}
          onClose={() => setPaymentAction(null)}
          onConfirm={async () => {
            if (paymentAction.type === "confirm") {
              await handleConfirmPayment(paymentAction.payment);
            }
            if (paymentAction.type === "issueReceipt") {
              await handleIssueReceipt(paymentAction.payment);
            }
            if (paymentAction.type === "cancelReceipt") {
              await handleCancelReceipt(paymentAction.payment);
            }
            setPaymentAction(null);
          }}
        />
      ) : null}

      {paymentToReverse ? (
        <PaymentReasonModal
          payment={paymentToReverse}
          title="Cofnąć wpłatę?"
          description="Podaj powód cofnięcia. System zapisze korektę zamiast usuwać historię płatności."
          reasonLabel="Powód cofnięcia"
          reason={reversalReason}
          placeholder="Np. błędnie zaksięgowana wpłata."
          confirmLabel="Cofnij wpłatę"
          processing={processingPaymentId === paymentToReverse.id}
          action="reverse"
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

function getPaymentActionModalCopy(type: PaymentAction) {
  if (type === "issueReceipt") {
    return {
      title: "Wystawić paragon?",
      description:
        "Po potwierdzeniu płatność będzie oznaczona jako rozliczona fiskalnie.",
      confirmLabel: "Wystaw paragon",
      icon: "receipt" as const,
    };
  }

  if (type === "cancelReceipt") {
    return {
      title: "Cofnąć paragon?",
      description:
        "Status paragonu zostanie cofnięty, a przy płatności ponownie pojawi się możliwość wystawienia paragonu.",
      confirmLabel: "Cofnij paragon",
      tone: "danger" as const,
      icon: "receipt" as const,
    };
  }

  return {
    title: "Potwierdzić wpłatę?",
    description:
      "Wpłata zostanie zaksięgowana na wybranym pakiecie, a ewentualna nadpłata trafi na saldo klienta.",
    confirmLabel: "Potwierdź wpłatę",
    icon: "confirm" as const,
  };
}

function SubscriptionPanel({
  billing,
  subscription,
  activePackage,
  currentCycle,
  selectedPackageId,
  packageOptions,
  clientLocationName,
  canAssignPackage,
  isSaving,
  onPackageChange,
  onAssignPackage,
  onCancelAfterCycle,
  onResumeAutoRenew,
}: {
  billing: ClientBillingSummary;
  subscription: ClientSubscription | null;
  activePackage: ClientPackageBilling | null;
  currentCycle: SubscriptionCycle | null;
  selectedPackageId: string;
  packageOptions: Array<{ value: string; label: string }>;
  clientLocationName: string;
  canAssignPackage: boolean;
  isSaving: boolean;
  onPackageChange: (value: string) => void;
  onAssignPackage: () => void;
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
  const hasActivePackage = Boolean(
    activePackage?.isActive || cycle?.isActive || billing.activeClientPackageId,
  );

  if (!hasActivePackage) {
    return (
      <section className="card-shell flex min-h-[360px] flex-col items-center justify-center p-6 text-center md:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-primary/15 text-primary-light">
          <PackagePlus size={28} />
        </div>
        <p className="mt-5 text-section-title">Ustaw pakiet klienta</p>
        <p className="mt-3 max-w-[560px] text-sm leading-6 text-on-surface-variant">
          Klient nie ma aktywnego pakietu. Wybierz jeden z pakietów dostępnych
          w lokalizacji {clientLocationName}.
        </p>

        {canAssignPackage ? (
          <div className="mt-7 grid w-full max-w-[680px] gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <CustomSelect
              label="Pakiet"
              value={selectedPackageId}
              onChange={onPackageChange}
              options={packageOptions}
            />
            <Button
              icon={<PackagePlus size={16} />}
              onClick={onAssignPackage}
              disabled={
                isSaving || !selectedPackageId || packageOptions.length <= 1
              }
              className="w-full sm:w-auto"
            >
              {isSaving ? "Ustawianie..." : "Ustaw pakiet"}
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-sm font-semibold text-on-surface-muted">
            Pakiet może ustawić właściciel studia.
          </p>
        )}

        {canAssignPackage && packageOptions.length <= 1 ? (
          <p className="mt-4 text-sm font-semibold text-warning-light">
            Brak aktywnych pakietów dla tej lokalizacji.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="card-shell p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-section-title">Pakiet klienta</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Aktualny pakiet, wykorzystanie wejść i status płatności.
          </p>
        </div>
        <StatusPill label={subscription?.status || "Brak statusu"} muted />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-low p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label text-on-surface-muted">Aktualny pakiet</p>
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
              <p className="text-label text-on-surface-muted">
                Automatyczne przedłużanie
              </p>
              <h3 className="mt-2 text-xl font-semibold text-on-surface">
                {willRenew ? "Włączone" : "Wyłączone"}
              </h3>
            </div>
            <StatusPill
              label={willRenew ? "Odnowienie" : "Zakończenie"}
              muted={!willRenew}
            />
          </div>
          <p className="mt-3 text-sm leading-5 text-on-surface-variant">
            {willRenew
              ? "Po wykorzystaniu aktualnego pakietu system przedłuży subskrypcję automatycznie."
              : "Po wykorzystaniu aktualnego pakietu subskrypcja klienta zostanie zakończona."}
          </p>
          <div className="mt-4">
            {willRenew ? (
              <Button
                variant="outline"
                onClick={onCancelAfterCycle}
                disabled={isSaving || !subscription}
              >
                Zakończ po pakiecie
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

    </section>
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
      <p className="text-section-title">Wykorzystanie pakietu</p>
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
                  Różnice w pakiecie
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
        <EmptyState label="Brak aktywnego pakietu do policzenia wykorzystania." />
      )}
    </section>
  );
}

function getCreatedPaymentMessage(payment: ClientPayment) {
  const breakdown = getPaymentBreakdown(payment);

  if (isPendingPayment(payment)) {
    return "Wpłata została dodana i oczekuje na potwierdzenie.";
  }

  if (isConfirmedPayment(payment)) {
    if (breakdown.balanceCreditAmount > 0) {
      return `Wpłata rozliczona: ${formatMoney(
        breakdown.appliedToPackageAmount,
        payment.currency,
      )} na pakiet i ${formatMoney(
        breakdown.balanceCreditAmount,
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

function packageMatchesClientLocation(
  item: Package,
  clientLocationId: number,
) {
  if (!clientLocationId) return false;

  return (
    item.locationId === clientLocationId ||
    Boolean(item.locationIds?.includes(clientLocationId))
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
