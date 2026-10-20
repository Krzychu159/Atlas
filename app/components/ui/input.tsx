"use client";

import * as React from "react";
import { compactControlHeightClassName, compactFieldLabelClassName, useFieldDensity } from "./field-density";
import { NativeDateInput } from "./native-date-input";

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <label className={className}>
      <span className={useFieldDensity() === "compact" ? `block ${compactFieldLabelClassName}` : "text-label text-on-surface-label"}>{label}</span>
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  wrapperClassName?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, wrapperClassName, ...props }, ref) => {
    const isDate = ["date", "datetime-local", "month"].includes(props.type || "");
    const Control = isDate ? NativeDateInput : "input";
    return (
      <div
        className={["relative w-full", wrapperClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {icon && !isDate && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-muted">
            {icon}
          </div>
        )}

        <Control
          ref={ref}
          className={[
            "w-full rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest py-3 text-sm text-on-surface placeholder:text-on-surface-muted transition-all",
            "hover:border-white/10 hover:bg-surface-container-low focus:border-primary-light/40 focus:outline-none focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
            "aria-[invalid=true]:border-error-light/60 aria-[invalid=true]:focus:border-error-light/70 aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-error)_22%,transparent)]",
            icon && !isDate ? "pl-10 pr-4" : "px-4",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
  /** Pass null while the value is valid, so the field keeps its structure (and focus) while typing. */
  error?: string | null;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;

export function TextField({
  label,
  value,
  onChange,
  icon,
  className,
  type = "text",
  error,
  ...props
}: TextFieldProps) {
  const compact = useFieldDensity() === "compact";
  const errorId = React.useId();
  const validated = error !== undefined;
  const describedBy = [props["aria-describedby"], error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const field = (
    <FormField label={label} className={validated ? undefined : className}>
      <Input
        {...props}
        {...(validated ? { "aria-invalid": Boolean(error), "aria-describedby": describedBy } : {})}
        type={type}
        value={value}
        icon={icon}
        onChange={(event) => onChange(event.target.value)}
        wrapperClassName={compact ? "mt-1.5" : "mt-2"}
        className={compact ? `${compactControlHeightClassName} py-0` : "h-12"}
      />
    </FormField>
  );
  if (!validated) return field;
  return (
    <div className={className}>
      {field}
      {error ? <p id={errorId} className="mt-1.5 text-xs font-medium text-error-light">{error}</p> : null}
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">;

export function TextArea({
  label,
  value,
  onChange,
  className,
  rows = 4,
  ...props
}: TextAreaProps) {
  const compact = useFieldDensity() === "compact";
  return (
    <FormField label={label} className={className}>
      <textarea
        {...props}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className={[
          compact ? "mt-1.5 px-3 py-2.5" : "mt-2 px-4 py-3",
          "w-full rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest text-sm text-on-surface outline-none placeholder:text-on-surface-muted transition-all",
          "hover:border-white/10 hover:bg-surface-container-low focus:border-primary-light/40 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
        ].join(" ")}
      />
    </FormField>
  );
}
