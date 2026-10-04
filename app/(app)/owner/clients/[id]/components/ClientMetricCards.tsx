import { CreditCard, Repeat2, UserRound } from "lucide-react";
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
}: {
  client: Client;
  subscription: ClientSubscription | null;
  usage?: SubscriptionUsage | null;
}) {
  const cycle = subscription?.currentCycle;
  const currency = cycle?.currency || client.currency || "PLN";
  const amountDue = formatMoney(cycle?.amountDue ?? 0, currency);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        label="Do zapłaty"
        value={amountDue}
        note={cycle?.packageName || "Aktualny cykl"}
        icon={<CreditCard size={22} />}
        highlight={(cycle?.amountDue ?? 0) > 0}
      />
      <MetricCard
        label="Trener opiekun"
        value={client.trainerFullName || "Brak"}
        note="Przypisany trener"
        icon={<UserRound size={22} />}
      />
      <MetricCard
        label="Następny pakiet"
        value={subscription?.nextPackage?.packageName || "Nie ustawiono"}
        note={
          subscription?.autoRenewEnabled
            ? "Automatyczne przedłużanie aktywne"
            : "Automatyczne przedłużanie wyłączone"
        }
        icon={<Repeat2 size={22} />}
      />
    </div>
  );
}
