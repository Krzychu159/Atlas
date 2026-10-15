"use client";

import type { CSSProperties } from "react";
import { ChevronRight, History } from "lucide-react";
import { ListState } from "@/app/components/ui/list/ListState";
import type { ActivityLogEntry } from "@/app/lib/owner/activity-log";
import { activityDate, actorLabel, entityLabel, objectLabel, operationLabel } from "@/app/lib/owner/activity-log-display";

export function OperationBadge({ operation }: { operation: string | null }) {
  const tone = operation === "Deleted" ? "bg-error-container text-on-error-container"
    : operation === "Created" || operation === "Restored" ? "bg-tertiary-container/25 text-tertiary-light"
    : operation === "Archived" ? "bg-surface-container-high text-on-surface-variant"
    : "bg-primary/15 text-primary-light";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{operationLabel(operation)}</span>;
}

// Columns live in a CSS variable, so the Tailwind class never changes and mobile cards keep their single column.
const activityGridClass = "xl:grid-cols-[var(--activity-columns)]";
const activityGridStyle = {
  "--activity-columns": "170px minmax(120px,1fr) 140px minmax(110px,0.8fr) minmax(150px,1.2fr) 90px",
} as CSSProperties;

export function ActivityList({ items, onSelect }: { items: ActivityLogEntry[]; onSelect: (entry: ActivityLogEntry) => void }) {
  if (!items.length) return <ListState variant="empty" icon={<History size={28} />} title="Brak zmian do wyświetlenia" message="Zmień lub wyczyść filtry, aby zobaczyć więcej wyników." />;
  return <div className="bg-surface-container-lowest">
    <div style={activityGridStyle} className={`hidden gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:grid ${activityGridClass}`} aria-hidden="true">
      <span>Data i godzina</span><span>Kto wykonał zmianę</span><span>Operacja</span><span>Rodzaj danych</span><span>Obiekt</span><span className="text-right">Szczegóły</span>
    </div>
    <div className="flex flex-col gap-3 p-3 xl:gap-0 xl:p-0">
      {items.map((entry, index) => <button key={entry.id} type="button" style={activityGridStyle} onClick={() => onSelect(entry)} aria-label={`Szczegóły: ${objectLabel(entry)}, ${operationLabel(entry.operation)}, ${activityDate(entry.createdAt)}`} className={`grid gap-3 rounded-[var(--radius-lg)] bg-surface-container p-4 text-left text-sm transition hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary-light xl:items-center xl:rounded-none xl:px-5 xl:py-4 ${index % 2 ? "xl:bg-surface-container-low" : "xl:bg-surface-container-lowest"} ${activityGridClass}`}>
        <time dateTime={entry.createdAt} className="text-xs text-on-surface-variant">{activityDate(entry.createdAt)}</time>
        <span className="break-words font-semibold">{actorLabel(entry)}</span>
        <span><OperationBadge operation={entry.operation} /></span>
        <span className="text-on-surface-muted">{entityLabel(entry.entityType)}</span>
        <span className="break-words font-semibold">{objectLabel(entry)}</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary-light xl:justify-end">Szczegóły <ChevronRight size={15} /></span>
      </button>)}
    </div>
  </div>;
}
