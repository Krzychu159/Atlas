"use client";

import { useId, type InputHTMLAttributes } from "react";
import { Input } from "./input";
import { compactControlHeightClassName, compactFieldLabelClassName, useFieldDensity } from "./field-density";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
};
export function DateInput({ label, value, onChange, wrapperClassName, id: providedId, className, ...props }: DateInputProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const compact = useFieldDensity() === "compact";
  return <label htmlFor={id} className={["block", wrapperClassName].filter(Boolean).join(" ")}>
    {label ? <span className={compact ? `block ${compactFieldLabelClassName}` : "text-label text-on-surface-muted"}>{label}</span> : null}
    <Input {...props} id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)}
      wrapperClassName={compact ? "mt-1.5" : "mt-2"} className={[compact ? `${compactControlHeightClassName} py-0` : "h-12", "font-semibold", className].filter(Boolean).join(" ")} />
  </label>;
}
