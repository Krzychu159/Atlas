"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";

type FilterToolbarProps = {
  children: ReactNode;
  gridClassName: string;
  advanced?: ReactNode;
  advancedId?: string;
  advancedGridClassName?: string;
  advancedOpen?: boolean;
  advancedActiveCount?: number;
  onAdvancedOpenChange?: (open: boolean) => void;
  canClear?: boolean;
  onClear: () => void;
};

export function FilterToolbar({
  children,
  gridClassName,
  advanced,
  advancedId,
  advancedGridClassName = "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
  advancedOpen = false,
  advancedActiveCount = 0,
  onAdvancedOpenChange,
  canClear = true,
  onClear,
}: FilterToolbarProps) {
  return (
    <section className="card-shell p-4 md:p-5">
      <div className={`grid gap-3 xl:items-end ${gridClassName}`}>
        {children}
        {advanced ? (
          <Button
            variant={advancedOpen ? "primary" : "secondary"}
            icon={<SlidersHorizontal size={16} />}
            onClick={() => onAdvancedOpenChange?.(!advancedOpen)}
            className="w-full xl:w-auto"
            aria-expanded={advancedOpen}
            aria-controls={advancedId}
          >
            Filtry
            {advancedActiveCount > 0 ? (
              <span
                className={[
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  advancedOpen
                    ? "bg-on-primary/20 text-on-primary"
                    : "bg-primary text-on-primary",
                ].join(" ")}
              >
                {advancedActiveCount}
              </span>
            ) : null}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClear} disabled={!canClear} className="w-full xl:w-auto">
          Wyczyść
        </Button>
      </div>

      {advanced && advancedOpen ? (
        <div
          id={advancedId}
          className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-3"
        >
          <div className={advancedGridClassName}>{advanced}</div>
        </div>
      ) : null}
    </section>
  );
}

export function FilterSearchField({
  value,
  onChange,
  placeholder,
  label = "Szukaj",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <label>
      <span className="text-label text-on-surface-muted">{label}</span>
      <div className="mt-2 flex h-12 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 transition focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]">
        <Search size={17} className="shrink-0 text-on-surface-muted" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-muted"
        />
      </div>
    </label>
  );
}
