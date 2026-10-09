"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import type { ActivityLogEntry } from "@/app/lib/owner/activity-log";
import { activityDate, actorLabel, entityLabel, fieldLabel, objectLabel, operationLabel, scalarValue } from "@/app/lib/owner/activity-log-display";

export function ActivityDetails({ entry, onClose, onRelated }: {
  entry: ActivityLogEntry; onClose: () => void; onRelated: (changeSetId: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab" || !dialog) return;
      const elements = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), summary, [tabindex="0"]'));
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [onClose]);

  const created = entry.operation === "Created";
  const deleted = entry.operation === "Deleted";
  const snapshot = created ? entry.after : deleted ? entry.before : null;
  const fields = created || deleted ? Object.keys(snapshot ?? {}) : [...new Set(entry.changedFields ?? [])];

  return <ModalOverlay onClose={onClose} className="md:justify-end">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Szczegóły zmiany: ${objectLabel(entry)}`} tabIndex={-1} className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[660px] overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 shadow-ambient outline-none md:max-h-[calc(100dvh-2rem)] md:p-6">
      <ModalHeader eyebrow={operationLabel(entry.operation)} title={objectLabel(entry)} onClose={onClose} />
      <div className="mt-4 grid gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4 text-sm sm:grid-cols-2">
        <div><p className="text-label text-on-surface-muted">Kto wykonał zmianę</p><p className="mt-1 break-words font-semibold">{actorLabel(entry)}</p></div>
        <div><p className="text-label text-on-surface-muted">Data i godzina</p><p className="mt-1">{activityDate(entry.createdAt)}</p></div>
        <div><p className="text-label text-on-surface-muted">Rodzaj danych</p><p className="mt-1">{entityLabel(entry.entityType)}</p></div>
      </div>
      <section className="mt-6">
        <h3 className="text-section-title">Co się zmieniło?</h3>
        {created || deleted ? <p className="mt-2 text-sm text-on-surface-muted">{created ? "Dane po dodaniu." : "Dane przed usunięciem."}</p> : null}
        <div className="mt-4 space-y-3">
          {fields.map((field) => <div key={field} className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
            <h4 className="mb-3 break-words text-sm font-semibold text-primary-light">{fieldLabel(field, entry.entityType)}</h4>
            {created || deleted ? <ValueBox label={created ? "Po" : "Przed"} value={snapshot?.[field]} field={field} entry={entry} snapshot={snapshot} highlight={created} /> : <div className="grid gap-3 sm:grid-cols-2">
              <ValueBox label="Przed" value={entry.before?.[field]} field={field} entry={entry} snapshot={entry.before} />
              <ValueBox label="Po" value={entry.after?.[field]} field={field} entry={entry} snapshot={entry.after} highlight />
            </div>}
          </div>)}
          {!fields.length ? <p className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm text-on-surface-muted">Szczegółowe wartości tej zmiany nie są dostępne.</p> : null}
        </div>
      </section>
      <details className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
        <summary className="cursor-pointer text-sm font-semibold text-on-surface-variant">Informacje techniczne</summary>
        <dl className="mt-4 space-y-3 text-xs">
          {[["ID wpisu", entry.id], ["ID użytkownika", entry.actorUserId], ["Typ obiektu", entry.entityType], ["ID obiektu", entry.entityId], ["Identyfikator grupy zmian", entry.changeSetId]].map(([label, value]) => <div key={String(label)}><dt className="text-on-surface-muted">{label}</dt><dd className="mt-1 break-all text-on-surface-variant">{value ?? "Brak wartości"}</dd></div>)}
        </dl>
      </details>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {entry.changeSetId ? <Button variant="secondary" onClick={() => onRelated(entry.changeSetId)}>Pokaż powiązane zmiany</Button> : null}
        <Button variant="ghost" onClick={onClose}>Zamknij</Button>
      </div>
    </div>
  </ModalOverlay>;
}

function ValueBox({ label, value, field, entry, snapshot, highlight = false }: {
  label: string; value: unknown; field: string; entry: ActivityLogEntry;
  snapshot: Record<string, unknown> | null; highlight?: boolean;
}) {
  return <div className={`min-w-0 rounded-[var(--radius-md)] p-3 ${highlight ? "bg-tertiary-container/20 text-tertiary-light" : "bg-surface-container-low text-on-surface-variant"}`}>
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
    <StructuredValue value={value} field={field} entityType={entry.entityType} snapshot={snapshot} />
  </div>;
}

function StructuredValue({ value, field, entityType, snapshot, depth = 0 }: {
  value: unknown; field: string; entityType: string | null; snapshot: Record<string, unknown> | null; depth?: number;
}) {
  if (value !== null && typeof value === "object") {
    // Keep deeply nested values readable without unbounded layout nesting.
    if (depth >= 5) return <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(value, null, 2)}</pre>;
    if (Array.isArray(value)) return value.length ? <ol className="list-inside list-decimal space-y-2 text-sm">{value.map((item, index) => <li key={index}><StructuredValue value={item} field={field} entityType={entityType} snapshot={snapshot} depth={depth + 1} /></li>)}</ol> : <p className="text-sm">Pusta lista</p>;
    const entries = Object.entries(value);
    return entries.length ? <dl className="space-y-2">{entries.map(([key, item]) => <div key={key}><dt className="break-words text-xs opacity-75">{fieldLabel(key, entityType)}</dt><dd className="mt-1 pl-2"><StructuredValue value={item} field={key} entityType={entityType} snapshot={value as Record<string, unknown>} depth={depth + 1} /></dd></div>)}</dl> : <p className="text-sm">Brak danych</p>;
  }
  return <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{scalarValue(value, field, entityType, snapshot)}</p>;
}
