"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  ClientPaymentStatus,
  getTpayErrorMessage,
  getTpayPayment,
  type ClientPaymentDto,
} from "@/app/lib/payments/tpay";

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 60_000;

type PageState = "loading" | "ready" | "error";

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <PaymentLoading />
        </PageShell>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const rawPaymentId = searchParams.get("paymentId");
  const paymentId = Number(rawPaymentId);

  const hasValidPaymentId =
    Boolean(rawPaymentId) &&
    Number.isInteger(paymentId) &&
    paymentId > 0;

  const [payment, setPayment] = useState<ClientPaymentDto | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [error, setError] = useState("");
  const [pollingEnded, setPollingEnded] = useState(false);

  useEffect(() => {
    if (!hasValidPaymentId) return;

    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    async function checkPayment() {
      try {
        const result = await getTpayPayment(paymentId);

        if (!active) return;

        setPayment(result);
        setState("ready");

        if (result.status !== ClientPaymentStatus.PendingConfirmation) {
          return;
        }

        if (Date.now() - startedAt >= POLL_TIMEOUT) {
          setPollingEnded(true);
          return;
        }

        timeout = setTimeout(() => {
          void checkPayment();
        }, POLL_INTERVAL);
      } catch (err) {
        if (!active) return;

        setState("error");
        setError(
          getTpayErrorMessage(
            err,
            "Nie udało się sprawdzić statusu płatności.",
          ),
        );
      }
    }

    void checkPayment();

    return () => {
      active = false;

      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [hasValidPaymentId, paymentId]);

  if (!hasValidPaymentId) {
    return (
      <PageShell>
        <PaymentError message="Nieprawidłowy identyfikator płatności." />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {state === "loading" ? (
        <PaymentLoading />
      ) : state === "error" ? (
        <PaymentError message={error} />
      ) : payment ? (
        <PaymentResult payment={payment} pollingEnded={pollingEnded} />
      ) : null}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 text-on-surface">
      <div className="w-full max-w-xl rounded-[32px] bg-surface-container p-6 shadow-ambient sm:p-10">
        {children}
      </div>
    </main>
  );
}

function PaymentLoading() {
  return (
    <div className="py-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary-light">
        <LoaderCircle size={28} className="animate-spin" />
      </span>

      <h1 className="mt-6 font-display text-3xl font-semibold">
        Sprawdzamy płatność
      </h1>

      <p className="mt-3 text-sm leading-6 text-on-surface-variant">
        Pobieramy aktualny status płatności z Tpay.
      </p>
    </div>
  );
}

function PaymentResult({
  payment,
  pollingEnded,
}: {
  payment: ClientPaymentDto;
  pollingEnded: boolean;
}) {
  const amount = formatPaymentAmount(payment.amount, payment.currency);

  if (payment.status === ClientPaymentStatus.Confirmed) {
    return (
      <ResultContent
        icon={<CheckCircle2 size={30} />}
        iconClassName="bg-tertiary/15 text-tertiary-light"
        title="Płatność potwierdzona"
        description={`Płatność ${amount} została poprawnie zaksięgowana.`}
      />
    );
  }

  if (payment.status === ClientPaymentStatus.Rejected) {
    return (
      <ResultContent
        icon={<XCircle size={30} />}
        iconClassName="bg-error/10 text-error-light"
        title="Płatność nie powiodła się"
        description={
          getTpayErrorMessage(
            payment.rejectionReason,
            "Tpay odrzucił płatność. Możesz spróbować ponownie.",
          )
        }
      />
    );
  }

  if (payment.status === ClientPaymentStatus.Cancelled) {
    return (
      <ResultContent
        icon={<XCircle size={30} />}
        iconClassName="bg-warning-container/50 text-warning-light"
        title="Płatność anulowana"
        description="Płatność została anulowana przed jej potwierdzeniem."
      />
    );
  }

  if (payment.status === ClientPaymentStatus.Reversed) {
    return (
      <ResultContent
        icon={<RotateCcw size={30} />}
        iconClassName="bg-warning-container/50 text-warning-light"
        title="Płatność cofnięta"
        description="Płatność została cofnięta lub zwrócona."
      />
    );
  }

  return (
    <ResultContent
      icon={
        pollingEnded ? (
          <Clock3 size={30} />
        ) : (
          <LoaderCircle size={30} className="animate-spin" />
        )
      }
      iconClassName="bg-primary/10 text-primary-light"
      title={
        pollingEnded
          ? "Płatność nadal oczekuje"
          : "Oczekujemy na potwierdzenie"
      }
      description={
        pollingEnded
          ? "Tpay nie potwierdził jeszcze płatności. Nie rozpoczynaj kolejnej płatności — sprawdź status ponownie za chwilę."
          : "Płatność jest przetwarzana. Status odświeży się automatycznie."
      }
    />
  );
}

function ResultContent({
  icon,
  iconClassName,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <div className="py-6 text-center">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${iconClassName}`}
      >
        {icon}
      </span>

      <h1 className="mt-6 font-display text-3xl font-semibold">{title}</h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
        {description}
      </p>

      <div className="mt-8">
        <Link
          href="/client/payments"
          className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary sm:w-auto"
        >
          Wróć do płatności
        </Link>
      </div>
    </div>
  );
}

function PaymentError({ message }: { message: string }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-error/10 text-error-light">
        <TriangleAlert size={30} />
      </span>

      <h1 className="mt-6 font-display text-3xl font-semibold">
        Nie udało się sprawdzić płatności
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
        {message}
      </p>

      <Link
        href="/client/payments"
        className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary sm:w-auto"
      >
        Wróć do płatności
      </Link>
    </div>
  );
}

function formatPaymentAmount(amount: number, currency: string | null) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency || "PLN",
  }).format(amount);
}
