import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
};

type ButtonLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
};

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-lg)] font-semibold tracking-normal transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary shadow-soft hover:bg-primary-container hover:shadow-ambient",
  secondary:
    "bg-surface-container-low text-on-surface hover:bg-surface-container-high",
  outline:
    "border border-secondary text-primary-light hover:border-primary-light hover:bg-surface-container-low",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
  danger:
    "bg-error-container text-on-error-container hover:bg-error hover:text-on-error",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-xs",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-6 text-sm",
  icon: "h-11 w-11 p-0",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[base, variants[variant], sizes[size], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon ? <span className="flex items-center">{icon}</span> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  size = "md",
  icon,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={[base, variants[variant], sizes[size], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon ? <span className="flex items-center">{icon}</span> : null}
      {children}
    </a>
  );
}
