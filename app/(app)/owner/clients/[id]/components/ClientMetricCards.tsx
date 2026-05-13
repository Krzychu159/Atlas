import { CreditCard, Dumbbell, Repeat2, UserRound } from "lucide-react";
import type {
  Client,
  ClientSubscription,
  SubscriptionUsage,
} from "@/app/lib/owner/clients";
import {
  formatClientBalance,
  getClientPackageUsage,
} from "../../components/client-display";

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
  usage,
}: {
  client: Client;
  subscription: ClientSubscription | null;
  usage: SubscriptionUsage | null;
}) {
  const cycle = subscription?.currentCycle;
  const packageUsage = getClientPackageUsage({
    ...client,
    packageName: cycle?.packageName ?? client.packageName,
    packageSessionsLimit:
      usage?.totalSessions ??
      cycle?.totalSessions ??
      client.packageSessionsLimit,
    packageSessionsUsed:
      usage?.usedSessions ?? cycle?.usedSessions ?? client.packageSessionsUsed,
  });
  const currency = cycle?.currency || client.currency || "PLN";
  const balance =
    subscription?.carryOverBalance !== undefined
      ? formatMoney(subscription.carryOverBalance, currency)
      : formatClientBalance(client);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Saldo"
        value={balance}
        note="Saldo klienta / carry-over"
        icon={<CreditCard size={22} />}
        highlight
      />
      <MetricCard
        label="Aktywny pakiet"
        value={packageUsage.label}
        note={packageUsage.packageName}
        icon={<Dumbbell size={22} />}
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
            ? "Auto-przedłużanie aktywne"
            : "Auto-przedłużanie wyłączone"
        }
        icon={<Repeat2 size={22} />}
      />
    </div>
  );
}
