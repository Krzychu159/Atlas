"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export type DateRangeValue = {
  from: string;
  to: string;
};

type DateRangeFilterProps = {
  label?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
};

export function DateRangeFilter({
  label = "Zakres dat",
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function updateRange(key: keyof DateRangeValue, nextValue: string) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  function clearRange() {
    onChange({ from: "", to: "" });
  }

  function handleFromChange(nextValue: string) {
    updateRange("from", nextValue);

    if (nextValue) {
      window.requestAnimationFrame(() => openDatePicker(toInputRef.current));
    }
  }

  function selectPreset(preset: DateRangePreset) {
    onChange(getPresetRange(preset));
  }

  return (
    <div
      ref={rootRef}
      className={["relative", className].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "flex h-12 w-full items-center gap-3 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-3 text-left transition",
          "hover:border-white/10 hover:bg-surface-container-low focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_24%,transparent)]",
          isOpen ? "border-primary-light/40 bg-surface-container-low" : "",
        ].join(" ")}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary-light ring-1 ring-primary-light/15">
          <CalendarDays size={18} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
            {label}
          </span>
          <span className="block truncate text-sm font-semibold text-on-surface">
            {getRangeLabel(value)}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={[
            "shrink-0 text-on-surface-muted transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(25rem,calc(100vw-2rem))] rounded-[var(--radius-xl)] border border-white/10 bg-surface-container p-4 shadow-ambient">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateInput
              label="Od"
              value={value.from}
              onChange={handleFromChange}
            />
            <DateInput
              inputRef={toInputRef}
              label="Do"
              value={value.to}
              onChange={(nextValue) => updateRange("to", nextValue)}
            />
          </div>

          <div className="mt-4 border-t border-white/5 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
              Szybki wybór
            </p>
            <div className="grid grid-cols-2 gap-2">
              {dateRangePresets.map((preset) => {
                const isActive = rangesEqual(value, getPresetRange(preset.value));

                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => selectPreset(preset.value)}
                    aria-pressed={isActive}
                    className={`min-h-9 rounded-[var(--radius-md)] px-3 py-2 text-left text-xs font-semibold transition last:col-span-2 ${
                      isActive
                        ? "bg-primary/18 text-primary-light ring-1 ring-primary-light/25"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearRange}
              icon={<X size={14} />}
            >
              Wyczyść
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsOpen(false)}
              icon={<Check size={14} />}
            >
              Zastosuj
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateInput({
  inputRef,
  label,
  value,
  onChange,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </span>
      <span className="relative mt-2 block">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full cursor-pointer rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-lowest px-3 pr-11 text-sm font-semibold text-on-surface outline-none [color-scheme:dark] hover:border-white/20 focus:border-primary-light/50 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary-light">
          <CalendarDays size={17} strokeWidth={2.2} />
        </span>
      </span>
    </label>
  );
}

type DateRangePreset =
  | "today"
  | "yesterday"
  | "last-seven-days"
  | "last-thirty-days"
  | "previous-month";

const dateRangePresets: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Dzisiaj" },
  { value: "yesterday", label: "Wczoraj" },
  { value: "last-seven-days", label: "Ostatnie 7 dni" },
  { value: "last-thirty-days", label: "Ostatnie 30 dni" },
  { value: "previous-month", label: "Poprzedni miesiąc" },
];

function getPresetRange(preset: DateRangePreset): DateRangeValue {
  const today = startOfDay(new Date());

  if (preset === "today") {
    const value = serializeDate(today);
    return { from: value, to: value };
  }

  if (preset === "yesterday") {
    const value = serializeDate(addDays(today, -1));
    return { from: value, to: value };
  }

  if (preset === "last-seven-days") {
    return { from: serializeDate(addDays(today, -6)), to: serializeDate(today) };
  }

  if (preset === "last-thirty-days") {
    return { from: serializeDate(addDays(today, -29)), to: serializeDate(today) };
  }

  const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayOfPreviousMonth = addDays(firstDayOfCurrentMonth, -1);

  return {
    from: serializeDate(firstDayOfPreviousMonth),
    to: serializeDate(lastDayOfPreviousMonth),
  };
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;

  input.focus();
  try {
    input.showPicker?.();
  } catch {
    // Sam fokus pozostaje bezpiecznym fallbackiem dla przeglądarek blokujących showPicker().
  }
}

function rangesEqual(first: DateRangeValue, second: DateRangeValue) {
  return first.from === second.from && first.to === second.to;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function serializeDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRangeLabel(value: DateRangeValue) {
  if (value.from && value.to) {
    return `${formatDate(value.from)} - ${formatDate(value.to)}`;
  }

  if (value.from) {
    return `Od ${formatDate(value.from)}`;
  }

  if (value.to) {
    return `Do ${formatDate(value.to)}`;
  }

  return "Dowolny zakres";
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
