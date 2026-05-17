"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  Repeat2,
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
  getClientSubscription,
  getClientSubscriptionUsage,
  resumeClientSubscription,
  setClientNextPackage,
  type Client,
  type ClientSubscription,
  type SubscriptionUsage,
} from "@/app/lib/owner/clients";
import {
  activateClientPackage,
  confirmClientPayment,
  createClientPackage,
  createClientPayment,
  getClientBilling,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  isConfirmedPayment,
  isPendingPayment,
  isRejectedPayment,
  paymentMethodOptions,
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

const fiscalStoragePrefix = "atlas-owner-client-fiscal-printed";

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
  const [packages, setPackages] = useState<Package[]>([]);
  const [printedIds, setPrintedIds] = useState<number[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
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
      setPrintedIds(readPrintedIds(parsedId));
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
      ] = await Promise.all([
        getClient(id),
        getClientBilling(id),
        getClientSubscription(id),
        getPackages(),
        getClientSubscriptionUsage(id).catch(() => null),
      ]);

      setClient(clientData);
      setBilling(billingData);
      setSubscription(subscriptionData);
      setUsage(usageData);
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

  async function handleAssignPackage() {
    if (!clientId || !selectedPackageId) return;

    const selectedPackage = packages.find(
      (item) => item.id === Number(selectedPackageId),
    );

    if (!selectedPackage) return;

    try {
      setIsSaving(true);
      await createClientPackage({
        clientId,
        packageId: selectedPackage.id,
        name: selectedPackage.name,
        totalSessions: selectedPackage.sessionsLimit,
        totalPrice: selectedPackage.price,
        expectedBillingType: selectedPackage.billingType || 1,
        purchaseDate: new Date().toISOString(),
        validUntil: addDaysIso(selectedPackage.durationDays),
        paymentDueDate: new Date().toISOString(),
      });
      showOwnerSuccess("Pakiet został przypisany klientowi.", {
        id: "owner-client-package-assigned",
      });
      setSelectedPackageId("");
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się przypisać pakietu.", {
        id: "owner-client-package-assign-error",
      });
    } finally {
      setIsSaving(false);
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
      setSubscription(data);
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
      setSubscription(data);
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

    if (selectedPackage.amountDue <= 0) {
      showOwnerError(new Error("Ten pakiet jest już opłacony."), "", {
        id: "owner-client-payment-package-paid",
      });
      return;
    }

    if (!amount || amount <= 0) {
      showOwnerError(new Error("Podaj poprawną kwotę wpłaty."), "", {
        id: "owner-client-payment-amount-invalid",
      });
      return;
    }

    if (amount > selectedPackage.amountDue) {
      showOwnerError(
        new Error(
          `Kwota wpłaty przekracza pozostałą należność: ${formatMoney(
            selectedPackage.amountDue,
            selectedPackage.currency,
          )}.`,
        ),
        "",
        { id: "owner-client-payment-amount-too-high" },
      );
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
        note: paymentNote.trim() || "Wpłata wpisana ręcznie przez ownera.",
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

  async function handleActivatePackage(clientPackageId: number) {
    if (!clientId) return;

    try {
      setIsSaving(true);
      await activateClientPackage(clientId, clientPackageId);
      showOwnerSuccess("Pakiet został aktywowany.", {
        id: `owner-client-package-activated-${clientPackageId}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się aktywować pakietu.", {
        id: `owner-client-package-activate-error-${clientPackageId}`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggleFiscal(payment: ClientPayment) {
    if (!clientId || !isConfirmedPayment(payment)) return;

    setPrintedIds((current) => {
      const next = current.includes(payment.id)
        ? current.filter((id) => id !== payment.id)
        : [...current, payment.id];

      writePrintedIds(clientId, next);
      return next;
    });
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

  const payments = billing?.payments || [];
  const selectedPaymentPackage = packagesBilling.find(
    (item) => item.clientPackageId === Number(paymentPackageId),
  );
  const parsedPaymentAmount = Number(paymentAmount.replace(",", "."));
  const paymentAmountTooHigh =
    Boolean(selectedPaymentPackage) &&
    parsedPaymentAmount > (selectedPaymentPackage?.amountDue || 0);
  const selectedPackageAlreadyPaid =
    Boolean(selectedPaymentPackage) &&
    (selectedPaymentPackage?.amountDue || 0) <= 0;

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
              label="Saldo klienta"
              value={formatMoney(billing.currentBalance, "PLN")}
              icon={<WalletCards size={18} />}
            />
            <BillingStat
              label="Aktywny pakiet"
              value={billing.activePackageName || "Brak"}
              icon={<PackagePlus size={18} />}
            />
            <BillingStat
              label="Zapłacono"
              value={formatMoney(billing.activePackageAmountPaid, "PLN")}
              icon={<CheckCircle2 size={18} />}
            />
            <BillingStat
              label="Do zapłaty"
              value={formatMoney(billing.activePackageAmountDue, "PLN")}
              icon={<ReceiptText size={18} />}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="card-shell p-4 md:p-5">
              <p className="text-section-title">Dodaj wpłatę klienta</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Ta wpłata jest zapisywana jako potwierdzona. Wybierz pakiet,
                żeby backend rozliczył właściwy cykl.
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
                <PaymentLimitHint
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
                    selectedPackageAlreadyPaid ||
                    paymentAmountTooHigh ||
                    !parsedPaymentAmount ||
                    parsedPaymentAmount <= 0
                  }
                >
                  Dodaj wpłatę
                </Button>
              </div>
            </div>

            <div className="card-shell p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-section-title">Historia wpłat</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Wpłaty są już potwierdzone. Zgłoszenia klientów można
                    potwierdzić tutaj albo w głównej kolejce płatności.
                  </p>
                </div>
                <p className="text-label text-on-surface-muted">
                  {payments.length} pozycji
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <ClientPaymentRow
                      key={payment.id}
                      payment={payment}
                      fiscalPrinted={printedIds.includes(payment.id)}
                      processing={processingPaymentId === payment.id}
                      onConfirm={() => handleConfirmPayment(payment)}
                      onToggleFiscal={() => handleToggleFiscal(payment)}
                    />
                  ))
                ) : (
                  <EmptyState label="Brak wpłat klienta." />
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="card-shell p-4 md:p-5">
              <div className="mb-4">
                <p className="text-section-title">Rozliczenie pakietów</p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Źródło prawdy z endpointu billing: cena, wpłaty, zaległość i
                  status płatności każdego cyklu.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {packagesBilling.length > 0 ? (
                  packagesBilling.map((item) => (
                    <ClientPackageRow
                      key={item.clientPackageId}
                      item={item}
                      onActivate={() =>
                        handleActivatePackage(item.clientPackageId)
                      }
                      disabled={isSaving}
                    />
                  ))
                ) : (
                  <EmptyState label="Klient nie ma jeszcze przypisanego pakietu." />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <UsageCard usage={usage} />

              <section className="card-shell p-4 md:p-5">
                <p className="text-section-title">Przypisz pakiet</p>
                <div className="mt-4 grid gap-3">
                  <CustomSelect
                    value={selectedPackageId}
                    onChange={setSelectedPackageId}
                    options={packageOptions}
                  />
                  <Button
                    icon={<PackagePlus size={16} />}
                    onClick={handleAssignPackage}
                    disabled={isSaving || !selectedPackageId}
                  >
                    Przypisz klientowi
                  </Button>
                </div>
              </section>

              <section className="card-shell p-4 md:p-5">
                <p className="text-section-title">Subskrypcja</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
                    <p className="text-label text-on-surface-muted">Status</p>
                    <p className="mt-2 font-semibold text-on-surface">
                      {subscription?.status || "Brak danych"}
                    </p>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Auto-przedłużanie:{" "}
                      {subscription?.autoRenewEnabled
                        ? "włączone"
                        : "wyłączone"}
                    </p>
                    {subscription?.cancelRenewalRequested ? (
                      <p className="mt-2 text-sm text-tertiary-light">
                        Zakończenie po obecnym cyklu jest już ustawione.
                      </p>
                    ) : null}
                  </div>
                  <CustomSelect
                    value={nextPackageId}
                    onChange={setNextPackageId}
                    options={packageOptions}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="secondary"
                      icon={<Repeat2 size={16} />}
                      onClick={handleSetNextPackage}
                      disabled={isSaving || !nextPackageId}
                    >
                      Ustaw następny pakiet
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRequestCancelAfterCycle}
                      disabled={
                        isSaving ||
                        !subscription ||
                        subscription.cancelRenewalRequested
                      }
                    >
                      Zakończ po cyklu
                    </Button>
                    {subscription?.cancelRenewalRequested ? (
                      <Button
                        variant="secondary"
                        onClick={handleResumeAutoRenew}
                        disabled={isSaving}
                      >
                        Włącz auto-przedłużanie
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function PaymentLimitHint({
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

  if (packageBilling.amountDue <= 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-tertiary-light/20 bg-tertiary-container/20 px-3 py-2 text-xs font-semibold text-tertiary-light">
        Ten pakiet jest już opłacony. Kolejna wpłata wymaga osobnego mechanizmu
        nadpłaty albo salda.
      </p>
    );
  }

  if (amount > packageBilling.amountDue) {
    return (
      <p className="rounded-[var(--radius-md)] border border-error-light/20 bg-error-container/20 px-3 py-2 text-xs font-semibold text-error-light">
        Kwota przekracza pozostałą należność:{" "}
        {formatMoney(packageBilling.amountDue, packageBilling.currency)}.
      </p>
    );
  }

  return (
    <p className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2 text-xs text-on-surface-muted">
      Maksymalna wpłata dla tego pakietu:{" "}
      <span className="font-semibold text-on-surface">
        {formatMoney(packageBilling.amountDue, packageBilling.currency)}
      </span>
      .
    </p>
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

function ClientPackageRow({
  item,
  disabled,
  onActivate,
}: {
  item: ClientPackageBilling;
  disabled: boolean;
  onActivate: () => void;
}) {
  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-on-surface">
              {item.packageName || `Pakiet #${item.packageId}`}
            </p>
            {item.isActive ? <StatusPill label="Aktywny cykl" /> : null}
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {item.usedSessions}/{item.totalSessions} treningów wykorzystanych ·{" "}
            {item.locationName || "Brak lokalizacji"}
          </p>
          <p className="mt-2 text-xs text-on-surface-muted">
            Status płatności: {item.paymentStatus || "brak danych"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <SmallMetric
            label="Cena"
            value={formatMoney(item.totalPrice, item.currency)}
          />
          <SmallMetric
            label="Wpłaty"
            value={formatMoney(item.amountPaid, item.currency)}
          />
          <SmallMetric
            label="Do zapłaty"
            value={formatMoney(item.amountDue, item.currency)}
          />
        </div>
        <Button
          size="sm"
          variant={item.isActive ? "secondary" : "outline"}
          onClick={onActivate}
          disabled={disabled || item.isActive}
        >
          {item.isActive ? "Aktywny" : "Aktywuj"}
        </Button>
      </div>
    </article>
  );
}

function UsageCard({ usage }: { usage: SubscriptionUsage | null }) {
  const totalSessions = usage?.totalSessions || 0;
  const usedSessions = usage?.usedSessions || 0;
  const progress = totalSessions
    ? Math.min(100, Math.round((usedSessions / totalSessions) * 100))
    : 0;
  const sessions = usage?.sessions?.slice(0, 3) || [];

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
              label="Typ"
              value={usage.expectedBillingType || "Brak"}
            />
            <SmallMetric
              label="Różnice"
              value={String(usage.differentThanExpectedCount)}
            />
            <SmallMetric
              label="Korekty"
              value={formatMoney(usage.adjustmentsTotal, "PLN")}
            />
          </div>

          {sessions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
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
                    {session.plannedBillingType || "plan"} →{" "}
                    {session.actualBillingType || "faktycznie"}
                  </p>
                </div>
              ))}
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
  fiscalPrinted,
  processing,
  onConfirm,
  onToggleFiscal,
}: {
  payment: ClientPayment;
  fiscalPrinted: boolean;
  processing: boolean;
  onConfirm: () => void;
  onToggleFiscal: () => void;
}) {
  const pending = isPendingPayment(payment);
  const confirmed = isConfirmedPayment(payment);
  const rejected = isRejectedPayment(payment);

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-on-surface">
              {formatMoney(payment.amount, payment.currency)}
            </p>
            <StatusPill
              label={getPaymentStatusLabel(payment.status)}
              muted={!confirmed}
            />
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {payment.packageName || "Pakiet nierozpoznany"} ·{" "}
            {formatDate(payment.paymentDate)}
          </p>
          {payment.note ? (
            <p className="mt-2 line-clamp-2 text-xs text-on-surface-muted">
              {payment.note}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-label text-on-surface-muted">Metoda</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {getPaymentMethodLabel(payment.method)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            size="sm"
            variant="secondary"
            icon={<FileCheck2 size={15} />}
            onClick={onToggleFiscal}
            disabled={!confirmed || fiscalPrinted}
          >
            {!confirmed
              ? "Po opłaceniu"
              : fiscalPrinted
                ? "Paragon wystawiony"
                : "Wystaw paragon"}
          </Button>
          <Button
            size="sm"
            icon={<CheckCircle2 size={15} />}
            onClick={onConfirm}
            disabled={!pending || processing}
          >
            {confirmed
              ? "Opłacone"
              : rejected
                ? "Odrzucone"
                : pending
                  ? "Potwierdź"
                  : getPaymentStatusLabel(payment.status)}
          </Button>
        </div>
      </div>
    </article>
  );
}

function getCreatedPaymentMessage(payment: ClientPayment) {
  if (isPendingPayment(payment)) {
    return "Wpłata została dodana i oczekuje na potwierdzenie.";
  }

  if (isConfirmedPayment(payment)) {
    return "Wpłata klienta została dodana jako opłacona.";
  }

  return "Wpłata klienta została dodana.";
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

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date.toISOString();
}

function readPrintedIds(clientId: number) {
  try {
    const raw = window.localStorage.getItem(
      `${fiscalStoragePrefix}-${clientId}`,
    );
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(parsed)
      ? parsed.filter((value): value is number => typeof value === "number")
      : [];
  } catch {
    return [];
  }
}

function writePrintedIds(clientId: number, ids: number[]) {
  window.localStorage.setItem(
    `${fiscalStoragePrefix}-${clientId}`,
    JSON.stringify(ids),
  );
}
