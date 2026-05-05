import { MoreVertical } from "lucide-react";
import type { RecentClient } from "@/app/lib/owner/dashboard";
import { formatRelativeDate, formatDateTime } from "@/app/lib/formatters/date";

function getClientName(client: RecentClient) {
  return client.fullName || client.name || "Klient";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardClientRow({
  client,
  mobile = false,
}: {
  client: RecentClient;
  mobile?: boolean;
}) {
  const name = getClientName(client);

  return (
    <div
      className={
        mobile
          ? "bg-surface-container-lowest rounded-[var(--radius-lg)] px-4 py-3 flex items-center justify-between gap-3"
          : "flex items-center justify-between gap-3"
      }
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary-light text-sm font-semibold shrink-0">
          {getInitials(name)}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-label text-tertiary-light mt-1 truncate">
            {client.activity || client.status || "Aktywny"}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 max-w-[112px]">
        <p className="text-xs text-on-surface-muted whitespace-nowrap">
          {formatRelativeDate(client.createdAt)}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-on-surface-muted/70">
          {formatDateTime(client.createdAt)}
        </p>
      </div>

      {mobile ? (
        <MoreVertical size={16} className="text-on-surface-muted shrink-0" />
      ) : null}
    </div>
  );
}
