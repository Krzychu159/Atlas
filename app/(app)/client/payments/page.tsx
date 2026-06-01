"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import { isNotFoundError } from "@/app/lib/backend";
import { formatDateTime } from "@/app/lib/formatters/date";
import { formatMoney } from "@/app/lib/formatters/money";
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
      if (isNotFoundError(err)) {
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
  const selectedPackage = packages.find(
    (item) => String(item.clientPackageId) === selectedPackageId,
  );
  const packageOptions = packages.map((item) => ({
    value: String(item.clientPackageId),
    label: `${item.packageName || "Pakiet"} · ${formatMoney(
      item.amountDue,
      item.currency,
    )} do zapłaty`,
  }));
  const numericAmount = Number(amount.replace(",", "."));
  const overpayment =
    selectedPackage && numericAmount > selectedPackage.amountDue
      ? numericAmount - selectedPackage.amountDue
      : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        packageOptions={packageOptions}
        selectedPackage={selectedPackage}
        selectedPackageId={selectedPackageId}
        amount={amount}
        method={method}
        note={note}
        overpayment={overpayment}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onAmountChange={setAmount}
        onMethodChange={setMethod}
        onNoteChange={setNote}
        onPackageChange={setSelectedPackageId}
        onSubmit={handleSubmit}
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

      <section className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
        <form onSubmit={handleSubmit} className="card-shell p-5 md:p-6">
          <div>
            <p className="text-label text-on-surface-muted">Nowa wpłata</p>
            <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-none">
              Zgłoś płatność
            </h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Wybierz pakiet, wpisz kwotę i metodę. Wpłata trafi do
              potwierdzenia w studiu.
            </p>
          </div>

          {!packages.length && !isLoading ? (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
              Nie masz aktywnego pakietu do opłacenia. Po przypisaniu pakietu
              formularz wpłaty będzie dostępny.
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-4">
            <Field label="Kwota">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="mt-2 h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
              />
            </Field>

            <CustomSelect
              label="Pakiet"
              value={selectedPackageId}
              onChange={setSelectedPackageId}
              options={
                packageOptions.length
                  ? packageOptions
                  : [{ value: "", label: "Brak pakietu do wyboru" }]
              }
              icon={<ReceiptText size={16} />}
            />

            <CustomSelect
              label="Metoda"
              value={method}
              onChange={setMethod}
              options={methodOptions}
              icon={<Landmark size={16} />}
            />

            {overpayment > 0 ? (
              <div className="rounded-[var(--radius-lg)] bg-tertiary-container/35 p-4 text-sm leading-6 text-tertiary-light">
                Nadpłata {formatMoney(overpayment, selectedPackage?.currency)} zasili
                saldo i zostanie odjęta od kolejnego pakietu.
              </div>
            ) : null}

            <Field label="Notatka">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Np. przelew za aktywny pakiet"
                className="mt-2 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
              />
            </Field>

            <Button
              type="submit"
              disabled={isSubmitting || !packages.length}
              icon={<CheckCircle2 size={16} />}
              className="w-full"
            >
              {isSubmitting ? "Zgłaszanie..." : "Zgłoś wpłatę"}
            </Button>
          </div>
        </form>

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
                <PaymentRow key={payment.id} payment={payment} />
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
    </div>
  );
}

function MobilePayments({
  billing,
  payments,
  packagesLength,
  packageOptions,
  selectedPackage,
  selectedPackageId,
  amount,
  method,
  note,
  overpayment,
  isLoading,
  isSubmitting,
  onAmountChange,
  onMethodChange,
  onNoteChange,
  onPackageChange,
  onSubmit,
}: {
  billing: ClientBillingSummary | null;
  payments: ClientPayment[];
  packagesLength: number;
  packageOptions: { value: string; label: string }[];
  selectedPackage?: { currency: string | null } | null;
  selectedPackageId: string;
  amount: string;
  method: string;
  note: string;
  overpayment: number;
  isLoading: boolean;
  isSubmitting: boolean;
  onAmountChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onPackageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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

      <form onSubmit={onSubmit} className="card-shell p-5">
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

        <div className="mt-5 flex flex-col gap-4">
          <Field label="Kwota">
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="mt-2 h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
            />
          </Field>

          <CustomSelect
            label="Pakiet"
            value={selectedPackageId}
            onChange={onPackageChange}
            options={
              packageOptions.length
                ? packageOptions
                : [{ value: "", label: "Brak pakietu do wyboru" }]
            }
            icon={<ReceiptText size={16} />}
          />

          <CustomSelect
            label="Metoda"
            value={method}
            onChange={onMethodChange}
            options={methodOptions}
            icon={<Landmark size={16} />}
          />

          {overpayment > 0 ? (
            <div className="rounded-[var(--radius-lg)] bg-tertiary-container/35 p-4 text-sm leading-6 text-tertiary-light">
              Nadpłata {formatMoney(overpayment, selectedPackage?.currency)} przejdzie
              na saldo.
            </div>
          ) : null}

          <Field label="Notatka">
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={3}
              placeholder="Np. przelew za pakiet"
              className="mt-2 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
            />
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting || !packagesLength}
            icon={<CheckCircle2 size={16} />}
            className="w-full"
          >
            {isSubmitting ? "Zgłaszanie..." : "Zgłoś wpłatę"}
          </Button>
        </div>
      </form>

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
              <MobilePaymentRow key={payment.id} payment={payment} />
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

function MobilePaymentRow({ payment }: { payment: ClientPayment }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">
            {formatMoney(payment.amount, payment.currency)}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
            {payment.packageName || "Bez pakietu"}
          </p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniAmount
          label="Na pakiet"
          value={formatMoney(payment.appliedToPackageAmount, payment.currency)}
        />
        <MiniAmount
          label="Saldo"
          value={
            payment.balanceCreditAmount > 0
              ? `+${formatMoney(payment.balanceCreditAmount, payment.currency)}`
              : formatMoney(payment.balanceCreditAmount, payment.currency)
          }
        />
      </div>

      <p className="mt-3 text-xs text-on-surface-muted">
        {getPaymentMethodLabel(payment.method)} · {formatDateTime(payment.paymentDate)}
      </p>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="text-label text-on-surface-muted">{label}</span>
      {children}
    </label>
  );
}

function PaymentRow({ payment }: { payment: ClientPayment }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">
              {formatMoney(payment.amount, payment.currency)}
            </p>
            <StatusBadge status={payment.status} />
            {payment.balanceCreditAmount > 0 ? (
              <span className="rounded-full bg-tertiary-container/45 px-2.5 py-1 text-xs font-semibold text-tertiary-light">
                Nadpłata
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            {payment.packageName || "Bez przypisanego pakietu"} ·{" "}
            {formatDateTime(payment.paymentDate)}
          </p>
          {payment.note ? (
            <p className="mt-2 text-sm text-on-surface-muted">{payment.note}</p>
          ) : null}
        </div>

        <div className="grid min-w-[300px] grid-cols-3 gap-2">
          <MiniAmount
            label="Wpłata"
            value={formatMoney(payment.amount, payment.currency)}
          />
          <MiniAmount
            label="Na pakiet"
            value={formatMoney(payment.appliedToPackageAmount, payment.currency)}
          />
          <MiniAmount
            label="Saldo"
            value={
              payment.balanceCreditAmount > 0
                ? `+${formatMoney(payment.balanceCreditAmount, payment.currency)}`
                : formatMoney(payment.balanceCreditAmount, payment.currency)
            }
          />
        </div>

        <div className="min-w-[150px] text-sm">
          <p className="text-label text-on-surface-muted">Metoda</p>
          <p className="mt-1 font-semibold">{getPaymentMethodLabel(payment.method)}</p>
        </div>
      </div>
    </div>
  );
}

function MiniAmount({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: number | null }) {
  const normalized = status ?? 0;
  const className =
    normalized === 2
      ? "bg-tertiary-container/45 text-tertiary-light"
      : normalized === 1
        ? "bg-warning-container/55 text-warning-light"
        : normalized === 3 || normalized === 5
          ? "bg-error-container/55 text-error-light"
          : "bg-surface-container-low text-on-surface-variant";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {getPaymentStatusLabel(status)}
    </span>
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

function getPaymentMethodLabel(method?: number | null) {
  const labels: Record<number, string> = {
    1: "Blik",
    2: "Przelew",
    3: "Gotówka",
    4: "Bramka płatności",
  };

  return method ? labels[method] || `Metoda ${method}` : "Brak metody";
}

function getPaymentStatusLabel(status?: number | string | null) {
  if (typeof status === "string") {
    const normalized = status.toLowerCase();
    if (normalized.includes("paid") || normalized.includes("confirm")) {
      return "Opłacone";
    }
    if (normalized.includes("pending")) return "Oczekuje";
    if (normalized.includes("reject")) return "Odrzucone";
    if (normalized.includes("reverse")) return "Cofnięte";

    return status || "Brak statusu";
  }

  const labels: Record<number, string> = {
    1: "Oczekuje",
    2: "Opłacone",
    3: "Odrzucone",
    4: "Anulowane",
    5: "Cofnięte",
  };

  return status ? labels[status] || `Status ${status}` : "Brak statusu";
}
