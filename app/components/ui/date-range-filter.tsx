"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";

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
        <span className="shrink-0 text-primary-light">
          <CalendarDays size={17} />
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
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(24rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-white/10 bg-surface-container p-3 shadow-ambient">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateInput
              label="Od"
              value={value.from}
              onChange={(nextValue) => updateRange("from", nextValue)}
            />
            <DateInput
              label="Do"
              value={value.to}
              onChange={(nextValue) => updateRange("to", nextValue)}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearRange}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 text-xs font-semibold text-on-surface-muted transition hover:bg-surface-container-low hover:text-on-surface"
            >
              <X size={14} />
              Wyczyść
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 text-xs font-semibold text-on-primary transition hover:bg-primary-container"
            >
              <Check size={14} />
              Zastosuj
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-[var(--radius-md)] border border-white/5 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface outline-none [color-scheme:dark] placeholder:text-on-surface-muted focus:border-primary-light/40"
      />
    </label>
  );
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
