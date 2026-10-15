"use client";

import { useId, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";

type FilterToolbarProps = {
  search?: ReactNode;
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
  search,
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
  // On phones only the search stays visible; every other filter sits behind one toggle.
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobilePanelId = useId();

  return (
    <section className="card-shell p-3 md:p-5">
      <div className={`grid gap-3 max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-end xl:items-end ${gridClassName}`}>
        {search}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls={mobilePanelId}
          className={[
            "relative flex h-11 items-center gap-2 rounded-[var(--radius-lg)] px-3 text-sm font-semibold transition md:hidden",
            mobileOpen ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high",
          ].join(" ")}
        >
          <SlidersHorizontal size={16} />
          Filtry
          {canClear && !mobileOpen ? (
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          ) : null}
          {canClear ? <span className="sr-only">(ustawione)</span> : null}
        </button>
        <div
          id={mobilePanelId}
          className={`${mobileOpen ? "contents" : "max-md:hidden md:contents"} max-md:[&>*]:col-span-2`}
        >
          {children}
          {advanced ? (
            <Button
              variant={advancedOpen ? "primary" : "secondary"}
              icon={<SlidersHorizontal size={16} />}
              onClick={() => onAdvancedOpenChange?.(!advancedOpen)}
              className="w-full max-md:hidden xl:w-auto"
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
          {advanced && mobileOpen ? (
            <div className="md:hidden">
              <div className={advancedGridClassName}>{advanced}</div>
            </div>
          ) : null}
          <Button variant="ghost" onClick={onClear} disabled={!canClear} className="h-11 w-full md:h-12 xl:w-auto">
            Wyczyść
          </Button>
        </div>
      </div>

      {advanced && advancedOpen ? (
        <div
          id={advancedId}
          className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-3 max-md:hidden"
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
    <label className="min-w-0">
      <span className="text-label text-on-surface-muted max-md:sr-only">{label}</span>
      <div className="flex h-11 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 transition focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] md:mt-2 md:h-12 md:px-4">
        <Search size={17} className="shrink-0 text-on-surface-muted" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-muted md:text-sm"
        />
      </div>
    </label>
  );
}
