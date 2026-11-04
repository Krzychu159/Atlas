"use client";
import { usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CreditCard, Dumbbell, Wallet } from "lucide-react";
import LegalTermsConsentCard from "@/app/components/legal/LegalTermsConsentCard";
import { PaymentEntryModal } from "@/app/components/payments/PaymentEntryModal";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { Button } from "@/app/components/ui/button";
import { RetryNotice } from "@/app/components/ui/retry-notice";
import {
  showAppError,
  showAppInfo,
  showAppSuccess,
} from "@/app/components/ui/app-toast";
import { isNotFoundLikeError } from "@/app/lib/backend";
import { formatCalendarDate } from "@/app/lib/formatters/date";
import { formatMoney } from "@/app/lib/formatters/money";
import { getPackagePaymentStatusLabel } from "@/app/lib/owner/billing";
import {
  canPayPackageOnline,
  getClientAmountDue,
  getClientBillingCurrency,
  getUnpaidPackages,
} from "@/app/lib/client/billing-summary";
import ClientPackagesSection from "@/app/(app)/owner/clients/[id]/components/ClientPackagesSection";
import ClientPeriodPackagesSection from "@/app/(app)/owner/clients/[id]/components/ClientPeriodPackagesSection";
import {
  createClientPortalPayment,
  getClientPortalBilling,
  type ClientBillingSummary,
  type ClientPackageBilling,
  type ClientPayment,
  type PaymentMethod,
} from "@/app/lib/client/portal";
import {
  ClientPaymentStatus,
  getTpayErrorMessage,
  startTpayCheckout,
} from "@/app/lib/payments/tpay";
import {
  getLegalRequirements,
  type LegalRequirements,
} from "@/app/lib/legal";

const methodOptions = [
  { value: "1", label: "Blik" },
  { value: "2", label: "Przelew" },
  { value: "3", label: "Gotówka" },
];

const CLIENT_PAYMENTS_PER_PAGE = 6;

type CheckoutTerms = {
  requirements: LegalRequirements;
  locationName: string | null;
};

export default function ClientPaymentsPage() {
  const paymentDateRevision = usePaymentDateCorrectionRevision();
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tpayPackageId, setTpayPackageId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("2");
  const [note, setNote] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutTerms, setCheckoutTerms] = useState<CheckoutTerms | null>(null);

  async function loadBilling() {
    try {
      setIsLoading(true);
      setLoadFailed(false);
      const data = await getClientPortalBilling();
      setBilling(data);
    } catch (err) {
      if (isNotFoundLikeError(err)) {
        setBilling(null);
        setSelectedPackageId("");
        setAmount("");
        return;
      }

      setLoadFailed(true);
      showAppError(err, "Nie udało się pobrać płatności.", {
        id: "client-payments-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBilling();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [paymentDateRevision]);

  const payments = useMemo(
    () => [...(billing?.payments || [])].sort(sortPaymentsByDate),
    [billing],
  );
  const packages = billing?.packages || [];
  const packageOptions = packages.map((item) => ({
    value: String(item.clientPackageId),
    label: `${item.packageName || "Pakiet"} · ${formatMoney(
      item.amountDue,
      item.currency,
    )} do zapłaty`,
    amountDue: item.amountDue,
    currency: item.currency,
  }));
  const numericAmount = Number(amount.replace(",", "."));
  const amountDue = getClientAmountDue(billing);
  const currency = getClientBillingCurrency(billing) || "PLN";
  const hasBillingData = Boolean(billing);
  const isBillingPending = !hasBillingData && (isLoading || loadFailed);
  const paymentActions = (
    <PaymentActions
      billing={billing}
      isLoading={isLoading}
      loadFailed={loadFailed}
      isSubmitting={isSubmitting}
      tpayPackageId={tpayPackageId}
      onPayOnline={handleTpayCheckout}
      onReport={openPaymentModal}
      onRetry={() => void loadBilling()}
    />
  );

  function dueAmountValue(item?: ClientPackageBilling) {
    return item && item.amountDue > 0 ? String(item.amountDue) : "";
  }

  function openPaymentModal(item?: ClientPackageBilling) {
    if (isSubmitting) return;
    const target =
      item ||
      packages.find(
        (candidate) =>
          candidate.clientPackageId === billing?.activeClientPackageId,
      ) ||
      packages[0];

    if (String(target?.clientPackageId ?? "") !== selectedPackageId) setNote("");
    setSelectedPackageId(String(target?.clientPackageId ?? ""));
    setAmount(dueAmountValue(target));
    setIsPaymentModalOpen(true);
  }

  function handlePackageChange(value: string) {
    const findPackage = (id: string) =>
      packages.find((item) => String(item.clientPackageId) === id);
    const previousDue = dueAmountValue(findPackage(selectedPackageId));

    // An amount typed by the client is kept; only the prefilled one follows the package.
    if (!amount.trim() || amount === previousDue) {
      setAmount(dueAmountValue(findPackage(value)));
    }
    setSelectedPackageId(value);
    setCheckoutTerms(null);
  }

  async function handleSubmit() {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showAppError(
        new Error("Wpisz poprawną kwotę wpłaty."),
        "Wpisz poprawną kwotę wpłaty.",
        { id: "client-payment-invalid-amount" },
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await createClientPortalPayment({
        clientId: billing?.clientId ?? null,
        clientPackageId: selectedPackageId ? Number(selectedPackageId) : null,
        amount: numericAmount,
        method: Number(method) as PaymentMethod,
        paymentDate: new Date().toISOString(),
        note: note.trim() || null,
      });

      showAppSuccess("Wpłata została zgłoszona do potwierdzenia.", {
        id: "client-payment-create-success",
      });
      setNote("");
      setIsPaymentModalOpen(false);
      await loadBilling();
    } catch (err) {
      showAppError(err, "Nie udało się zgłosić wpłaty.", {
        id: "client-payment-create-error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTpayCheckout(selectedPackage: ClientPackageBilling) {
    if (tpayPackageId !== null) return;
    const clientPackageId = selectedPackage.clientPackageId;

    if (selectedPackage.locationId === null) {
      showAppError(
        new Error(
          "Pakiet nie ma przypisanej lokalizacji. Skontaktuj się ze studiem.",
        ),
        "Nie można sprawdzić regulaminu dla tego pakietu.",
        { id: "client-payment-tpay-package-location" },
      );
      return;
    }

    try {
      setTpayPackageId(clientPackageId);

      const legalRequirements = await getLegalRequirements(
        selectedPackage.locationId,
      );

      if (
        legalRequirements.acceptanceRequired &&
        !legalRequirements.isAccepted
      ) {
        setCheckoutTerms({
          requirements: legalRequirements,
          locationName: selectedPackage.locationName,
        });
        showAppInfo(
          "Przed rozpoczęciem płatności zaakceptuj aktualny regulamin studia.",
          { id: "client-payment-tpay-terms-required" },
        );
        return;
      }

      setCheckoutTerms(null);

      const payment = await startTpayCheckout(clientPackageId);

      if (payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }

      switch (payment.status) {
        case ClientPaymentStatus.PendingConfirmation:
          throw new Error(
            "Płatność została rozpoczęta i oczekuje na potwierdzenie. Nie uruchamiaj kolejnej płatności. Sprawdź status ponownie za chwilę.",
          );

        case ClientPaymentStatus.Rejected:
          throw new Error(
            "Nie udało się rozpocząć płatności online. Spróbuj ponownie.",
          );

        case ClientPaymentStatus.Confirmed:
          showAppSuccess("Płatność została już potwierdzona.", {
            id: "client-payment-tpay-confirmed",
          });
          await loadBilling();
          return;

        case ClientPaymentStatus.Cancelled:
          throw new Error(
            "Płatność została anulowana. Możesz rozpocząć nową płatność.",
          );

        case ClientPaymentStatus.Reversed:
          throw new Error(
            "Płatność została cofnięta. Sprawdź historię płatności lub skontaktuj się ze studiem.",
          );

        default:
          throw new Error(
            "Nie udało się pobrać adresu do płatności. Spróbuj ponownie później.",
          );
      }
    } catch (err) {
      showAppError(
        new Error(
          getTpayErrorMessage(
            err,
            "Nie udało się rozpocząć płatności online.",
          ),
        ),
        "Nie udało się rozpocząć płatności online.",
        {
          id: "client-payment-tpay-error",
        },
      );
    } finally {
      setTpayPackageId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <MobilePayments
        billing={billing}
        isLoading={isLoading}
        actions={paymentActions}
      />

      <div className="hidden flex-col gap-5 md:flex">
        <section className="flex flex-col gap-3">
          <p className="text-label text-primary-light">Płatności</p>
          <h1 className="font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Rozliczenia pakietu
          </h1>
          <p className="max-w-[760px] text-sm leading-6 text-on-surface-variant">
            Tu sprawdzasz kwoty z aktywnego pakietu i zgłaszasz wpłatę do
            potwierdzenia przez studio.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <SummaryCard
            icon={<CreditCard size={20} />}
            label="Łącznie do zapłaty"
            value={formatAmountDue(billing)}
            note="Wszystkie pakiety"
            loading={isLoading}
            accent={
              amountDue === null ? "primary" : amountDue > 0 ? "warning" : "success"
            }
          />
          <SummaryCard
            icon={<Dumbbell size={20} />}
            label="Bieżący pakiet indywidualny"
            value={!billing ? "Niedostępne" : billing.activeClientPackageId ? billing.activePackageName || "Brak nazwy" : "Brak pakietu"}
            note={billing ? getPackagePaymentStatusLabel(billing.activePackagePaymentStatus) : ""}
            loading={isLoading}
          />
          <SummaryCard
            icon={<Wallet size={20} />}
            label="Saldo do wykorzystania"
            value={billing ? formatMoney(billing.currentBalance, currency) : "Niedostępne"}
            note={
              !billing
                ? ""
                : billing.currentBalance > 0
                  ? "Zostanie odjęte od kolejnego pakietu"
                  : "Brak nadpłaty"
            }
            loading={isLoading}
            accent={(billing?.currentBalance ?? 0) > 0 ? "success" : "primary"}
          />
          <SummaryCard
            icon={<CalendarDays size={20} />}
            label="Zapłacono"
            value={billing ? formatMoney(billing.activePackageAmountPaid, currency) : "Niedostępne"}
            note={billing ? `Cena pakietu: ${formatMoney(billing.activePackageTotalPrice, currency)}` : ""}
            loading={isLoading}
          />
        </section>

        {paymentActions}
      </div>

      {checkoutTerms && !checkoutTerms.requirements.isAccepted ? (
        <section className="card-shell p-5 md:p-6">
          <p className="text-label text-warning-light">Wymagana akceptacja</p>
          <h2 className="mt-2 font-display text-[1.55rem] font-semibold leading-none">
            Regulamin przed płatnością
          </h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Zaakceptuj aktualny regulamin studia, a następnie ponownie rozpocznij
            płatność online.
          </p>
          <div className="mt-5">
            <LegalTermsConsentCard
              requirements={checkoutTerms.requirements}
              locationName={checkoutTerms.locationName}
              onAccepted={(requirements) =>
                setCheckoutTerms((current) =>
                  current ? { ...current, requirements } : current,
                )
              }
            />
          </div>
        </section>
      ) : null}

      {isBillingPending ? null : <ClientPackagesSection audience="client" packages={billing?.packages} activeClientPackageId={billing?.activeClientPackageId} />}
      {billing && !isLoading ? <ClientPeriodPackagesSection clientId={billing.clientId} portal="client" packages={billing.packages} onPayment={openPaymentModal} /> : null}
      {!hasBillingData && loadFailed ? null : <ClientPaymentHistory payments={payments} isLoading={isLoading} />}

      <PaymentEntryModal
        open={isPaymentModalOpen}
        eyebrow="Płatność"
        title="Zgłoś wpłatę"
        description="Wybierz pakiet i wpisz kwotę. Studio potwierdzi wpłatę po sprawdzeniu płatności."
        amount={amount}
        packageId={selectedPackageId}
        method={method}
        note={note}
        packageOptions={packageOptions}
        methodOptions={methodOptions}
        isSubmitting={isSubmitting}
        submitLabel="Zgłoś wpłatę"
        submittingLabel="Zgłaszanie..."
        emptyPackagesMessage="Nie masz aktywnego pakietu do opłacenia. Skontaktuj się z trenerem lub obsługą studia."
        onAmountChange={setAmount}
        onPackageChange={handlePackageChange}
        onMethodChange={setMethod}
        onNoteChange={setNote}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function PaymentActions({
  billing,
  isLoading,
  loadFailed,
  isSubmitting,
  tpayPackageId,
  onPayOnline,
  onReport,
  onRetry,
}: {
  billing: ClientBillingSummary | null;
  isLoading: boolean;
  loadFailed: boolean;
  isSubmitting: boolean;
  tpayPackageId: number | null;
  onPayOnline: (item: ClientPackageBilling) => void;
  onReport: (item?: ClientPackageBilling) => void;
  onRetry: () => void;
}) {
  if (!billing && isLoading) {
    return <div className="card-shell h-40 animate-pulse" />;
  }

  if (!billing && loadFailed) {
    return (
      <RetryNotice
        text="Nie udało się pobrać płatności, dlatego nie możemy pokazać kwot do zapłaty."
        onRetry={onRetry}
      />
    );
  }

  const packagesCount = billing?.packages?.length ?? 0;
  const unpaidPackages = getUnpaidPackages(billing);
  const amountDue = getClientAmountDue(billing);

  if (unpaidPackages.length) {
    return (
      <section className="card-shell p-5 md:p-6">
        <p className="text-label text-warning-light">Do opłacenia</p>
        <h2 className="mt-2 font-display text-[1.55rem] font-semibold leading-none md:text-[1.85rem]">
          {unpaidPackages.length === 1 ? "Opłać pakiet" : "Opłać pakiety"}
        </h2>

        <div className="mt-5 flex flex-col gap-3">
          {unpaidPackages.map((item) => (
            <div
              key={item.clientPackageId}
              className="flex min-w-0 flex-col gap-4 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">
                  {item.packageName || "Pakiet"}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Do zapłaty: {formatMoney(item.amountDue, item.currency)}
                  {item.paymentDueDate
                    ? ` · Termin: ${formatCalendarDate(item.paymentDueDate)}`
                    : ""}
                </p>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={() => onReport(item)}
                  className="w-full sm:w-auto"
                >
                  Zgłoś wpłatę
                </Button>
                {canPayPackageOnline(item) ? (
                  <Button
                    size="lg"
                    disabled={tpayPackageId !== null}
                    onClick={() => onPayOnline(item)}
                    className="w-full sm:w-auto"
                  >
                    {tpayPackageId === item.clientPackageId
                      ? "Przygotowywanie płatności..."
                      : `Zapłać ${formatMoney(item.amountDue, item.currency)}`}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm leading-6 text-on-surface-variant">
          Płatność przelewem lub gotówką zgłoś jako wpłatę. Studio potwierdzi ją
          po sprawdzeniu.
        </p>
      </section>
    );
  }

  return (
    <section className="card-shell flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div>
        <h2 className="font-display text-[1.55rem] font-semibold leading-none md:text-[1.85rem]">
          {!packagesCount
            ? "Brak pakietu do opłacenia"
            : amountDue === null
              ? "Płatności"
              : amountDue > 0
                ? "Masz należność do wyjaśnienia"
                : "Wszystko opłacone"}
        </h2>
        <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
          {!packagesCount
            ? "Skontaktuj się z trenerem lub obsługą studia, żeby przypisać pakiet."
            : amountDue !== null && amountDue > 0
              ? "Skontaktuj się ze studiem, żeby sprawdzić tę kwotę."
              : "Jeśli zapłata została wykonana poza aplikacją, możesz ją zgłosić do potwierdzenia."}
        </p>
      </div>

      {packagesCount ? (
        <Button
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          onClick={() => onReport()}
          className="w-full shrink-0 md:w-auto"
        >
          Zgłoś wpłatę
        </Button>
      ) : null}
    </section>
  );
}

function MobilePayments({
  billing,
  isLoading,
  actions,
}: {
  billing: ClientBillingSummary | null;
  isLoading: boolean;
  actions: React.ReactNode;
}) {
  const currency = getClientBillingCurrency(billing) || "PLN";
  const due = getClientAmountDue(billing);

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section>
        <p className="text-label text-primary-light">Płatności</p>
        <h1 className="mt-2 font-display text-[1.6rem] md:text-[2.15rem] font-semibold leading-[0.95]">
          Twoje rozliczenia
        </h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Zgłoś wpłatę i sprawdź historię rozliczeń pakietu.
        </p>
      </section>

      <section className="card-shell p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-on-surface-muted">Do zapłaty</p>
            {isLoading ? (
              <div className="mt-4 h-9 w-32 animate-pulse rounded bg-surface-container-lowest" />
            ) : (
              <p
                className={[
                  "mt-4 font-semibold leading-none",
                  due === null
                    ? "text-[1.55rem] text-on-surface-variant"
                    : due > 0
                      ? "text-[2.25rem] text-warning-light"
                      : "text-[2.25rem] text-tertiary-light",
                ].join(" ")}
              >
                {formatAmountDue(billing)}
              </p>
            )}
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Wszystkie pakiety
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MobilePaymentStat
            label="Zapłacono"
            value={billing ? formatMoney(billing.activePackageAmountPaid, currency) : "—"}
          />
          <MobilePaymentStat
            label="Saldo"
            value={billing ? formatMoney(billing.currentBalance, currency) : "—"}
          />
        </div>
      </section>

      {actions}
    </div>
  );
}

function ClientPaymentHistory({
  payments,
  isLoading,
}: {
  payments: ClientPayment[];
  isLoading: boolean;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(payments.length / CLIENT_PAYMENTS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = payments.slice(
    (currentPage - 1) * CLIENT_PAYMENTS_PER_PAGE,
    currentPage * CLIENT_PAYMENTS_PER_PAGE,
  );

  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft">
      <div className="flex flex-col gap-2 px-4 py-5 sm:flex-row sm:items-end sm:justify-between md:px-5">
        <div>
          <p className="text-label text-on-surface-muted">Historia</p>
          <h2 className="mt-2 font-display text-[1.55rem] font-semibold leading-none md:text-[1.85rem]">
            Wpłaty klienta
          </h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Kwota, sposób rozliczenia i status każdej wpłaty w jednym wierszu.
          </p>
        </div>
        {!isLoading ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
            {payments.length} {payments.length === 1 ? "płatność" : "płatności"}
          </p>
        ) : null}
      </div>

      <PaymentsList
        payments={visiblePayments}
        isLoading={isLoading}
        processingId={null}
        showClient={false}
        emptyTitle="Brak zapisanych wpłat"
        emptyMessage="Pierwsza zgłoszona wpłata pojawi się tutaj."
      />

      {!isLoading && payments.length > 0 ? (
        <PaymentPagination
          page={currentPage}
          pageSize={CLIENT_PAYMENTS_PER_PAGE}
          totalItems={payments.length}
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}

function MobilePaymentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  note,
  loading,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  loading: boolean;
  accent?: "primary" | "success" | "warning";
}) {
  const accentClass =
    accent === "success"
      ? "bg-tertiary-container/45 text-tertiary-light"
      : accent === "warning"
        ? "bg-warning-container/55 text-warning-light"
        : "bg-primary/15 text-primary-light";

  return (
    <div className="card-shell p-5">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] ${accentClass}`}
      >
        {icon}
      </div>
      <p className="mt-5 text-label text-on-surface-muted">{label}</p>
      {loading ? (
        <div className="mt-3 h-7 animate-pulse rounded bg-surface-container-lowest" />
      ) : (
        <p className="mt-3 line-clamp-2 text-[1.45rem] font-semibold leading-tight">
          {value}
        </p>
      )}
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{note}</p>
    </div>
  );
}

function sortPaymentsByDate(first: ClientPayment, second: ClientPayment) {
  return getTime(second.paymentDate) - getTime(first.paymentDate);
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatAmountDue(billing: ClientBillingSummary | null) {
  const amountDue = getClientAmountDue(billing);

  return amountDue === null
    ? "Niedostępne"
    : formatMoney(amountDue, getClientBillingCurrency(billing) || "PLN");
}
