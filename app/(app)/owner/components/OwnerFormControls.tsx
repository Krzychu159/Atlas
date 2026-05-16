import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export function OwnerFormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>
      {children}
    </label>
  );
}

type OwnerTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;

export function OwnerTextField({
  label,
  value,
  onChange,
  className,
  type = "text",
  ...props
}: OwnerTextFieldProps) {
  return (
    <OwnerFormField label={label} className={className}>
      <input
        {...props}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
      />
    </OwnerFormField>
  );
}

type OwnerTextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">;

export function OwnerTextArea({
  label,
  value,
  onChange,
  className,
  rows = 4,
  ...props
}: OwnerTextAreaProps) {
  return (
    <OwnerFormField label={label} className={className}>
      <textarea
        {...props}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
      />
    </OwnerFormField>
  );
}
