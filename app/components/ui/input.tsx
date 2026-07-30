import * as React from "react";

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <label className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>
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
    return (
      <div
        className={["relative w-full", wrapperClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-muted">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          className={[
            "w-full rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest py-3 text-sm text-on-surface placeholder:text-on-surface-muted transition-all",
            "hover:border-white/10 hover:bg-surface-container-low focus:border-primary-light/40 focus:outline-none focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
            icon ? "pl-10 pr-4" : "px-4",
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
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;

export function TextField({
  label,
  value,
  onChange,
  icon,
  className,
  type = "text",
  ...props
}: TextFieldProps) {
  return (
    <FormField label={label} className={className}>
      <Input
        {...props}
        type={type}
        value={value}
        icon={icon}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12"
      />
    </FormField>
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
  return (
    <FormField label={label} className={className}>
      <textarea
        {...props}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "mt-2 w-full rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-muted transition-all",
          "hover:border-white/10 hover:bg-surface-container-low focus:border-primary-light/40 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
        ].join(" ")}
      />
    </FormField>
  );
}
