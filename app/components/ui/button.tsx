import * as React from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
};

export function Button({
  children,
  variant = "primary",
  icon,
  className,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center gap-2 rounded-default px-6 py-2 text-sm font-medium transition-all duration-200 max-h-12 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "bg-primary-container text-on-primary-container hover:bg-primary shadow-soft",
    secondary:
      "bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
  };

  return (
    <button
      className={[base, variants[variant], className].join(" ")}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
