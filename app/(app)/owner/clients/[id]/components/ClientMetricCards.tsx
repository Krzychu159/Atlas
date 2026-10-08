import { CreditCard, Repeat2, UserRound } from "lucide-react";
import type { ClientBillingSummary } from "@/app/lib/owner/billing";
import type {
  Client,
  ClientSubscription,
  SubscriptionUsage,
} from "@/app/lib/owner/clients";

function formatMoney(value: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({
  label,
  value,
  note,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  note?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-label text-on-surface-variant">{label}</p>
        <div className="text-primary-light">{icon}</div>
      </div>
      <p
        className={`mt-6 text-[2rem] font-semibold leading-none ${
          highlight ? "text-tertiary-light" : "text-on-surface"
        }`}
      >
        {value}
      </p>
      {note ? (
        <p className="mt-3 text-sm leading-5 text-on-surface-muted">{note}</p>
      ) : null}
    </div>
  );
}

export default function ClientMetricCards({
  client,
  subscription,
  billing,
  preserveMissingData = false,
}: {
  client: Client;
  subscription: ClientSubscription | null;
  billing?: ClientBillingSummary | null;
  usage?: SubscriptionUsage | null;
  preserveMissingData?: boolean;
}) {
  const cycle = subscription?.currentCycle;
  const currency = cycle?.currency || client.currency || "PLN";
  const amountDue = typeof billing?.totalAmountDue === "number" ? formatMoney(billing.totalAmountDue, currency) : "Niedostępne";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Łącznie do zapłaty"
        value={amountDue}
        note="Wszystkie pakiety klienta"
        icon={<CreditCard size={22} />}
        highlight={(billing?.totalAmountDue ?? 0) > 0}
      />
      <MetricCard
        label="Saldo do wykorzystania"
        value={billing ? formatMoney(billing.currentBalance, currency) : "Niedostępne"}
        icon={<UserRound size={22} />}
      />
      <MetricCard
        label="Bieżący pakiet indywidualny"
        value={preserveMissingData && !billing ? "Niedostępne" : billing?.activeClientPackageId ? billing.activePackageName || "Brak nazwy" : "Brak"}
        icon={<UserRound size={22} />}
      />
      <MetricCard
        label="Automatyczne przedłużanie"
        value={subscription ? subscription.autoRenewEnabled && !subscription.cancelRenewalRequested ? "Włączone" : "Wyłączone" : "Niedostępne"}
        note={
          preserveMissingData && !subscription
            ? "Brak danych o automatycznym przedłużaniu"
            : subscription?.autoRenewEnabled && !subscription.cancelRenewalRequested
            ? "Automatyczne przedłużanie aktywne"
            : "Automatyczne przedłużanie wyłączone"
        }
        icon={<Repeat2 size={22} />}
      />
    </div>
  );
}
