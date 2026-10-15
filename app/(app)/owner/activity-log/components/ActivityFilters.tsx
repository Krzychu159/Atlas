"use client";

import { useState } from "react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import { defaultActivityFilters, type ActivityFilters as Filters, type ActivityLogMetadata } from "@/app/lib/owner/activity-log";
import { entityLabel, operationLabel, sourceLabel } from "@/app/lib/owner/activity-log-display";

export function ActivityFilters({ value, metadata, onChange, onClear }: {
  value: Filters;
  metadata: ActivityLogMetadata | null;
  onChange: (value: Filters) => void;
  onClear: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const update = (key: keyof Filters, next: string) => onChange({ ...value, [key]: next });
  const advancedActiveCount = [value.entityType, value.operation, value.source].filter(Boolean).length;
  const canClear = (Object.keys(defaultActivityFilters) as (keyof Filters)[]).some((key) => value[key] !== defaultActivityFilters[key]);

  return (
    <FilterToolbar
      search={<FilterSearchField value={value.search} maxLength={200} onChange={(next) => update("search", next)} placeholder="Szukaj osoby lub obiektu..." />}
      gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_260px_auto_auto]"
      advancedId="activity-advanced-filters"
      advancedGridClassName="grid gap-3 md:grid-cols-3"
      advancedOpen={advancedOpen}
      advancedActiveCount={advancedActiveCount}
      onAdvancedOpenChange={setAdvancedOpen}
      canClear={canClear}
      onClear={onClear}
      advanced={<>
        <CustomSelect label="Rodzaj danych" value={value.entityType} options={[{ value: "", label: "Wszystkie" }, ...[...new Set(metadata?.entityTypes ?? [])].map((type) => ({ value: type, label: entityLabel(type) }))]} onChange={(entityType) => onChange({ ...value, entityType, entityId: "" })} />
        <CustomSelect label="Operacja" value={value.operation} options={[{ value: "", label: "Wszystkie" }, ...[...new Set(metadata?.operations ?? [])].map((operation) => ({ value: operation, label: operationLabel(operation) }))]} onChange={(next) => update("operation", next)} />
        <CustomSelect label="Źródło" value={value.source} options={[{ value: "", label: "Wszyscy" }, ...[...new Set(metadata?.sources ?? [])].map((source) => ({ value: source, label: sourceLabel(source) }))]} onChange={(next) => update("source", next)} />
      </>}
    >
      <DateRangeFilter value={{ from: value.dateFrom, to: value.dateTo }} onChange={(range) => onChange({ ...value, dateFrom: range.from, dateTo: range.to })} />
    </FilterToolbar>
  );
}

/* Filtry identyfikatorów ukryte — zachowane do ewentualnego przywrócenia.
{advancedOpen ? (
  <div id="activity-advanced-filters" className="mt-4 grid gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-3 md:grid-cols-3">
    <FilterInput label="ID użytkownika" value={value.actorUserId} onChange={(next) => update("actorUserId", next)} inputMode="numeric" maxLength={10} />
    <div><FilterInput label="ID obiektu" value={value.entityId} onChange={(next) => update("entityId", next)} disabled={!value.entityType} maxLength={200} />{!value.entityType ? <p className="mt-2 text-xs text-on-surface-muted">Najpierw wybierz rodzaj danych.</p> : null}</div>
    <FilterInput label="Identyfikator grupy zmian" value={value.changeSetId} onChange={(next) => update("changeSetId", next)} maxLength={36} />
  </div>
) : null}
*/

/* Pomocnicze pole ukrytych filtrów identyfikatorów.
function FilterInput({ label, value, onChange, disabled, maxLength, inputMode }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean;
  maxLength?: number; inputMode?: "numeric";
}) {
  return <label className={`flex min-h-12 flex-col justify-center rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] ${disabled ? "opacity-50" : ""}`}>
    <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} maxLength={maxLength} inputMode={inputMode} className="mt-0.5 h-5 w-full bg-transparent text-sm text-on-surface outline-none disabled:cursor-not-allowed" />
  </label>;
}
*/
