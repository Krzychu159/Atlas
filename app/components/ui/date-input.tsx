"use client";

import { useId, type InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { formatDateInputValue } from "@/app/lib/formatters/date";

type DateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
};

export function DateInput({
  label,
  value,
  onChange,
  wrapperClassName,
  id: providedId,
  disabled,
  ...props
}: DateInputProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const displayValue = formatDateInputValue(value);

  return (
    <label
      htmlFor={id}
      className={["block", wrapperClassName].filter(Boolean).join(" ")}
    >
      {label ? (
        <span className="text-label text-on-surface-muted">{label}</span>
      ) : null}
      <span
        className={[
          "relative mt-2 flex h-12 w-full items-center rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-4 pr-12 text-sm transition-all",
          "hover:border-white/10 hover:bg-surface-container-low focus-within:border-primary-light/40 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        ].join(" ")}
      >
        <span
          className={
            displayValue
              ? "font-semibold text-on-surface"
              : "text-on-surface-muted"
          }
        >
          {displayValue || "dd.mm.rrrr"}
        </span>
        <CalendarDays
          size={18}
          className="pointer-events-none absolute right-4 text-primary-light"
        />
        <input
          {...props}
          id={id}
          type="date"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onClick={(event) => event.currentTarget.showPicker?.()}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </span>
    </label>
  );
}
