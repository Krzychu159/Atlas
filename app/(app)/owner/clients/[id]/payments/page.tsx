"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  OwnerTextField,
} from "@/app/(app)/owner/components/OwnerFormControls";
import {
  cancelClientSubscription,
  getClient,
  getClientSubscription,
  resumeClientSubscription,
  setClientNextPackage,
  type Client,
  type ClientSubscription,
} from "@/app/lib/owner/clients";
import {
  activateClientPackage,
  confirmClientPayment,
  createClientPackage,
  createClientPayment,
  getClientBilling,
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

export default function OwnerClientPaymentsPage() {
  const params = useParams<{ id: string }>();
  const [clientId, setClientId] = useState<number | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(
    null,
  );
  const [packages, setPackages] = useState<Package[]>([]);
  const [printedIds, setPrintedIds] = useState<number[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [nextPackageId, setNextPackageId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPackageId, setPaymentPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsedId = Number(params.id);

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
  }, [params.id]);

  async function loadClientPayments(id = clientId) {
    if (!id) return;

    try {
      setIsLoading(true);
      const [clientData, billingData, subscriptionData, packagesData] =
        await Promise.all([
          getClient(id),
          getClientBilling(id),
          getClientSubscription(id),
          getPackages(),
        ]);

      setClient(clientData);
      setBilling(billingData);
      setSubscription(subscriptionData);
      setPackages(packagesData.filter((item) => item.isActive));
      setPaymentAmount(String(Math.max(billingData.activePackageAmountDue, 0)));

      const activePackageId = billingData.activeClientPackageId
        ? String(billingData.activeClientPackageId)
        : "";

      setPaymentPackageId(activePackageId);
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
        clientPackageId: paymentPackageId ? Number(paymentPackageId) : null,
        amount,
        method: Number(paymentMethod) as PaymentMethod,
        paymentDate: new Date().toISOString(),
        note: "Wpłata dodana ręcznie przez ownera.",
      });

      showOwnerSuccess(getCreatedPaymentMessage(createdPayment), {
        id: "owner-client-payment-created",
      });
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
      showOwnerSuccess("Wpłata została oznaczona jako opłacona.", {
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

  function handleToggleFiscal(paymentId: number) {
    if (!clientId) return;

    setPrintedIds((current) => {
      const next = current.includes(paymentId)
        ? current.filter((id) => id !== paymentId)
        : [...current, paymentId];

      writePrintedIds(clientId, next);
      return next;
    });
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
  const clientPackageOptions = useMemo(
    () => [
      { value: "", label: "Bez pakietu" },
      ...(billing?.packages || []).map((item) => ({
        value: String(item.clientPackageId),
        label: item.packageName || `Pakiet #${item.clientPackageId}`,
      })),
    ],
    [billing?.packages],
  );

  const payments = billing?.payments || [];
  const packagesBilling = billing?.packages || [];

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

          <section className="order-3 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="card-shell p-4 md:p-5">
              <div className="mb-4">
                <p className="text-section-title">Rozliczenie pakietów</p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Skąd wynika saldo, kwota wpłat i zaległość klienta.
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
                      {subscription?.autoRenewEnabled ? "włączone" : "wyłączone"}
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
                  <div className="flex flex-col gap-2 sm:flex-row">
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

          <section className="order-2 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="card-shell p-4 md:p-5">
              <p className="text-section-title">Dodaj wpłatę</p>
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
                  onChange={setPaymentPackageId}
                  options={clientPackageOptions}
                />
                <CustomSelect
                  label="Metoda"
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={paymentMethodOptions}
                />
                <Button
                  icon={<ReceiptText size={16} />}
                  onClick={handleCreatePayment}
                  disabled={isSaving}
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
                    Wpłaty klienta z możliwością potwierdzenia i wystawienia
                    paragonu.
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
                      onToggleFiscal={() => handleToggleFiscal(payment.id)}
                    />
                  ))
                ) : (
                  <EmptyState label="Brak wpłat klienta." />
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

const paymentMethodOptions = [
  { value: "1", label: "Gotówka" },
  { value: "2", label: "Karta" },
  { value: "3", label: "Przelew" },
  { value: "4", label: "Inna" },
];

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
          <p className="font-semibold text-on-surface">
            {item.packageName || `Pakiet #${item.packageId}`}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {item.usedSessions}/{item.totalSessions} treningów wykorzystanych ·{" "}
            {item.locationName || "Brak lokalizacji"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <SmallMetric label="Cena" value={formatMoney(item.totalPrice, item.currency)} />
          <SmallMetric label="Wpłaty" value={formatMoney(item.amountPaid, item.currency)} />
          <SmallMetric label="Zaległość" value={formatMoney(item.amountDue, item.currency)} />
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
  const confirmed = isConfirmedPayment(payment);

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-on-surface">
            {formatMoney(payment.amount, payment.currency)}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {payment.packageName || "Bez pakietu"} ·{" "}
            {formatDate(payment.paymentDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<FileCheck2 size={15} />}
            onClick={onToggleFiscal}
            disabled={fiscalPrinted}
          >
            {fiscalPrinted ? "Paragon wystawiony" : "Wystaw paragon"}
          </Button>
          <Button
            size="sm"
            icon={<CheckCircle2 size={15} />}
            onClick={onConfirm}
            disabled={confirmed || processing}
          >
            {confirmed ? "Opłacone" : "Oznacz opłacone"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function isPendingPayment(payment: ClientPayment) {
  return payment.status === 1 && !payment.confirmedAt && !payment.rejectedAt;
}

function isConfirmedPayment(payment: ClientPayment) {
  return payment.status === 2 || Boolean(payment.confirmedAt);
}

function getCreatedPaymentMessage(payment: ClientPayment) {
  if (isPendingPayment(payment)) {
    return "Wpłata została dodana i oczekuje na potwierdzenie.";
  }

  return "Wpłata została dodana.";
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 font-semibold text-on-surface">{value}</p>
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
    const raw = window.localStorage.getItem(`${fiscalStoragePrefix}-${clientId}`);
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
