"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Dumbbell,
  Wallet,
} from "lucide-react";
import { PaymentEntryModal } from "@/app/components/payments/PaymentEntryModal";
import {
  PaymentCompactRow,
  PaymentOperationRow,
} from "@/app/components/payments/PaymentDisplay";
import { Button } from "@/app/components/ui/button";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import { isNotFoundLikeError } from "@/app/lib/backend";
import { formatMoney } from "@/app/lib/formatters/money";
import { getPaymentStatusLabel } from "@/app/lib/payments/display";
import {
  createClientPortalPayment,
  getClientPortalBilling,
  type ClientBillingSummary,
  type ClientPayment,
  type PaymentMethod,
} from "@/app/lib/client/portal";

const methodOptions = [
  { value: "1", label: "Blik" },
  { value: "2", label: "Przelew" },
  { value: "3", label: "Gotówka" },
  { value: "4", label: "Bramka płatności" },
];

export default function ClientPaymentsPage() {
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("2");
  const [note, setNote] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  async function loadBilling() {
    try {
      setIsLoading(true);
      const data = await getClientPortalBilling();
      setBilling(data);
      setSelectedPackageId((current) => {
        if (current) return current;
        return data.activeClientPackageId
          ? String(data.activeClientPackageId)
          : String(data.packages?.[0]?.clientPackageId || "");
      });
      setAmount((current) => {
        if (current) return current;
        return data.activePackageAmountDue > 0
          ? String(data.activePackageAmountDue)
          : "";
      });
    } catch (err) {
      if (isNotFoundLikeError(err)) {
        setBilling(null);
        setSelectedPackageId("");
        setAmount("");
        return;
      }

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
  }, []);

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

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <MobilePayments
        billing={billing}
        payments={payments}
        packagesLength={packages.length}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
      />

      <div className="hidden flex-col gap-5 md:flex">
      <section className="flex flex-col gap-3">
        <p className="text-label text-primary-light">Płatności</p>
        <h1 className="font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
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
          label="Do zapłaty"
          value={formatMoney(billing?.activePackageAmountDue ?? 0, getCurrency(billing))}
          note={billing?.activePackageName || "Aktywny pakiet"}
          loading={isLoading}
          accent={(billing?.activePackageAmountDue ?? 0) > 0 ? "warning" : "success"}
        />
        <SummaryCard
          icon={<Dumbbell size={20} />}
          label="Aktywny pakiet"
          value={billing?.activePackageName || "Brak pakietu"}
          note={getPaymentStatusLabel(billing?.activePackagePaymentStatus)}
          loading={isLoading}
        />
        <SummaryCard
          icon={<Wallet size={20} />}
          label="Saldo"
          value={formatMoney(billing?.currentBalance ?? 0, getCurrency(billing))}
          note={
            (billing?.currentBalance ?? 0) > 0
              ? "Zostanie odjęte od kolejnego pakietu"
              : "Brak nadpłaty"
          }
          loading={isLoading}
          accent={(billing?.currentBalance ?? 0) > 0 ? "success" : "primary"}
        />
        <SummaryCard
          icon={<CalendarDays size={20} />}
          label="Zapłacono"
          value={formatMoney(billing?.activePackageAmountPaid ?? 0, getCurrency(billing))}
          note={`Cena pakietu: ${formatMoney(
            billing?.activePackageTotalPrice ?? 0,
            getCurrency(billing),
          )}`}
          loading={isLoading}
        />
      </section>

      <section className="grid gap-4">
        <div className="card-shell flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <p className="text-label text-on-surface-muted">Nowa wpłata</p>
            <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-none">
              Zgłoś płatność
            </h2>
            <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
              Wybierz pakiet, wpisz kwotę i metodę. Wpłata trafi do
              potwierdzenia w studiu.
            </p>
            {!packages.length && !isLoading ? (
              <p className="mt-3 text-sm font-semibold text-warning-light">
                Nie masz aktywnego pakietu do opłacenia.
              </p>
            ) : null}
          </div>
          <Button
            size="lg"
            disabled={isSubmitting || !packages.length}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full md:w-auto"
          >
            Zgłoś wpłatę
          </Button>
        </div>

        <div className="card-shell p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-on-surface-muted">Historia</p>
              <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-none">
                Wpłaty klienta
              </h2>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Kwota wpłaty pokazuje ile faktycznie wpłacono. Osobno widać,
                ile poszło na pakiet i ile zostało jako saldo.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {isLoading ? (
              <PaymentSkeleton />
            ) : payments.length ? (
              payments.map((payment) => (
                <PaymentOperationRow
                  key={payment.id}
                  payment={payment}
                  showClient={false}
                />
              ))
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
                Brak zapisanych wpłat.
              </div>
            )}
          </div>
        </div>
      </section>
      </div>

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
        onPackageChange={setSelectedPackageId}
        onMethodChange={setMethod}
        onNoteChange={setNote}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function MobilePayments({
  billing,
  payments,
  packagesLength,
  isLoading,
  isSubmitting,
  onOpenPaymentModal,
}: {
  billing: ClientBillingSummary | null;
  payments: ClientPayment[];
  packagesLength: number;
  isLoading: boolean;
  isSubmitting: boolean;
  onOpenPaymentModal: () => void;
}) {
  const currency = getCurrency(billing);
  const due = billing?.activePackageAmountDue ?? 0;

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section>
        <p className="text-label text-primary-light">Płatności</p>
        <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[0.95]">
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
                  "mt-4 text-[2.25rem] font-semibold leading-none",
                  due > 0 ? "text-warning-light" : "text-tertiary-light",
                ].join(" ")}
              >
                {formatMoney(due, currency)}
              </p>
            )}
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {billing?.activePackageName || "Aktywny pakiet"}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MobilePaymentStat
            label="Zapłacono"
            value={formatMoney(billing?.activePackageAmountPaid ?? 0, currency)}
          />
          <MobilePaymentStat
            label="Saldo"
            value={formatMoney(billing?.currentBalance ?? 0, currency)}
          />
        </div>
      </section>

      <section className="card-shell p-5">
        <p className="text-label text-on-surface-muted">Nowa wpłata</p>
        <h2 className="mt-2 font-display text-[1.55rem] font-semibold leading-none">
          Zgłoś płatność
        </h2>

        {!packagesLength && !isLoading ? (
          <div className="mt-5 rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
            Nie masz jeszcze aktywnego pakietu do opłacenia. Skontaktuj się z
            trenerem lub obsługą studia, żeby przypisać pakiet.
          </div>
        ) : null}

        <Button
          size="lg"
          disabled={isSubmitting || !packagesLength}
          onClick={onOpenPaymentModal}
          className="mt-5 w-full"
        >
          Zgłoś wpłatę
        </Button>
      </section>

      <section className="card-shell p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-label text-on-surface-muted">Historia</p>
            <h2 className="mt-2 font-display text-[1.55rem] font-semibold leading-none">
              Ostatnie wpłaty
            </h2>
          </div>
          <span className="text-sm text-on-surface-muted">
            {payments.length}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {isLoading ? (
            <PaymentSkeleton />
          ) : payments.length ? (
            payments.slice(0, 5).map((payment) => (
              <PaymentCompactRow key={payment.id} payment={payment} />
            ))
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
              Brak zapisanych wpłat.
            </div>
          )}
        </div>
      </section>
    </div>
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
      <div className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] ${accentClass}`}>
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

function PaymentSkeleton() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-surface-container-lowest"
        />
      ))}
    </>
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

function getCurrency(billing?: ClientBillingSummary | null) {
  const activePackage = billing?.packages?.find(
    (item) => item.clientPackageId === billing.activeClientPackageId,
  );

  return activePackage?.currency || billing?.payments?.[0]?.currency || "PLN";
}
