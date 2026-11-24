"use client";

import { useState } from "react";
import { normalizeTimeInput } from "@/app/lib/availability-time";

/**
 * A short "HH:mm" field. People can type "8", "830" or "8.30"; a readable value is passed up
 * while typing and the text is tidied up on blur.
 */
export function TimeField({
  value,
  onChange,
  label,
  invalid,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : value;

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={5}
      aria-label={label}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      value={shown}
      placeholder="08:00"
      onFocus={(event) => {
        setText(value);
        setFocused(true);
        event.currentTarget.select();
      }}
      onChange={(event) => {
        setText(event.target.value);
        onChange(normalizeTimeInput(event.target.value) ?? event.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        const normalized = normalizeTimeInput(text);
        if (normalized && normalized !== value) onChange(normalized);
      }}
      className={[
        "h-10 w-[4.25rem] rounded-[var(--radius-default)] bg-surface-container-lowest px-2 text-center text-sm font-semibold tabular-nums text-on-surface transition",
        "placeholder:text-on-surface-muted hover:bg-surface-container-low focus:outline-none focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_45%,transparent)]",
        "aria-[invalid=true]:shadow-[0_0_0_1px_var(--color-error-light)] disabled:opacity-55",
      ].join(" ")}
    />
  );
}
