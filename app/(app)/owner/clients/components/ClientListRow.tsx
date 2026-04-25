import { MoreVertical } from "lucide-react";
import type { Client } from "@/app/lib/owner/clients";

function getInitials(client: Client) {
  const name = client.fullName || `${client.firstName} ${client.lastName}`;

  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getBillingStyles(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("paid") || normalized.includes("opłac")) {
    return "bg-tertiary-container text-tertiary-light";
  }

  if (
    normalized.includes("overdue") ||
    normalized.includes("zaleg") ||
    normalized.includes("debt")
  ) {
    return "bg-error-container text-error-light";
  }

  return "bg-surface-container-high text-on-surface-variant";
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
  const fullName = client.fullName || `${client.firstName} ${client.lastName}`;
  const progress = Math.max(0, Math.min(client.progressPercent || 0, 100));

  return (
    <div className="bg-surface-container rounded-[var(--radius-lg)] px-4 py-3.5 grid grid-cols-[64px_1.25fr_1fr_1.25fr_120px_28px] gap-4 items-center">
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
          Cel: {client.goal || "Nie określono"}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-label text-on-surface-variant">Trener</p>
        <p className="text-sm font-semibold truncate">
          {client.trainerFullName || "Nie przypisano"}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-label text-on-surface-variant">Postęp treningowy</p>
        <div className="mt-1 flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-surface-container-lowest overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-gradient"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-primary-light shrink-0">
            {progress}%
          </p>
        </div>
      </div>

      <span
        className={`w-fit px-3 py-1.5 rounded-full text-[11px] font-semibold ${getBillingStyles(
          client.billingStatus,
        )}`}
      >
        {client.billingStatus || "Brak statusu"}
      </span>

      <button className="text-on-surface-muted hover:text-on-surface transition-colors">
        <MoreVertical size={18} />
      </button>
    </div>
  );
}
