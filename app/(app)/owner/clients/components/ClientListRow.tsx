import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Client } from "@/app/lib/owner/clients";
import {
  formatClientBalance,
  getClientName,
  getClientPackageUsage,
} from "./client-display";

function getInitials(client: Client) {
  const name = getClientName(client);

  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStatusDot(client: Client) {
  const normalized = client.status?.toLowerCase();

  if (normalized === "active" || normalized === "aktywny") {
    return "bg-tertiary-light";
  }

  if (normalized === "suspended" || normalized === "zawieszony") {
    return "bg-error-light";
  }

  return "bg-primary-light";
}

export default function ClientListRow({ client }: { client: Client }) {
  const fullName = getClientName(client);
  const packageUsage = getClientPackageUsage(client);

  return (
    <div className="bg-surface-container rounded-[var(--radius-lg)] px-4 py-3.5 grid grid-cols-[64px_1.2fr_1fr_1.35fr_112px_44px] gap-4 items-center">
      <div className="relative h-14 w-14 rounded-[var(--radius-md)] bg-surface-container-low overflow-hidden flex items-center justify-center shrink-0">
        {client.avatarUrl ? (
          <img
            src={client.avatarUrl}
            alt={fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-primary-light font-semibold">
            {getInitials(client)}
          </span>
        )}

        <span
          className={`absolute right-1 bottom-1 h-3 w-3 rounded-full border-2 border-surface-container ${getStatusDot(
            client,
          )}`}
        />
      </div>

      <div className="min-w-0">
        <p className="text-base font-semibold truncate">{fullName}</p>
        <p className="text-label text-on-surface-variant mt-1 truncate">
          {client.email || "Brak adresu e-mail"}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-label text-on-surface-variant">Trener</p>
        <p className="text-sm font-semibold truncate">
          {client.trainerFullName || "Nie przypisano"}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-label text-on-surface-variant">
          Wykorzystanie pakietu
        </p>
        <div className="mt-1 flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-surface-container-lowest overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-gradient"
              style={{ width: `${packageUsage.percent}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-primary-light shrink-0">
            {packageUsage.label}
          </p>
        </div>
        <p className="mt-1 text-[11px] text-on-surface-muted truncate">
          {packageUsage.packageName}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-label text-on-surface-variant">Balance</p>
        <p className="mt-1 text-sm font-semibold text-tertiary-light truncate">
          {formatClientBalance(client)}
        </p>
      </div>

      <Link
        href={`/owner/clients/${client.id}`}
        prefetch={false}
        aria-label={`Przejdź do profilu klienta ${fullName}`}
        className="ml-auto flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-primary-light transition-colors hover:bg-surface-container-high hover:text-on-surface"
      >
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}
