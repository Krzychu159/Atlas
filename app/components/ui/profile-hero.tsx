import Link from "next/link";
import type { ReactNode } from "react";
import { Tooltip } from "@/app/components/ui/tooltip";

const focusRing =
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]";

export const profilePrimaryActionClassName = `inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const profileSecondaryActionClassName = `inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-surface-container-low px-4 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export function ProfileChip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function ProfileMetaItem({
  icon,
  label,
  muted = false,
  children,
}: {
  icon: ReactNode;
  label?: string;
  muted?: boolean;
  children: ReactNode;
}) {
  const content = (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${muted ? "text-on-surface-muted" : ""}`}>
      <span className="shrink-0 text-primary-light">{icon}</span>
      {label ? <span className="sr-only">{label}: </span> : null}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );

  return label ? <Tooltip label={label} align="start">{content}</Tooltip> : content;
}

export function ProfileInfoStat({
  icon,
  label,
  muted = false,
  children,
}: {
  icon: ReactNode;
  label: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        <span className="text-primary-light">{icon}</span>
        {label}
      </p>
      <div className={`mt-1 break-words text-sm font-semibold ${muted ? "text-on-surface-muted" : "text-on-surface"}`}>
        {children}
      </div>
    </div>
  );
}

export function ProfileIconActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-surface-container-lowest p-1">
      {children}
    </div>
  );
}

export function ProfileIconAction({
  label,
  href,
  onClick,
  disabled = false,
  tone = "default",
  align = "center",
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  align?: "center" | "end";
  children: ReactNode;
}) {
  const className = [
    `inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] transition disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`,
    tone === "danger" ? "text-error-light hover:bg-error-container/25" : "text-primary-light hover:bg-surface-container-high",
  ].join(" ");

  return (
    <Tooltip label={label} align={align}>
      {href ? (
        <Link href={href} aria-label={label} className={className}>
          {children}
        </Link>
      ) : (
        <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={className}>
          {children}
        </button>
      )}
    </Tooltip>
  );
}

export type ProfileTab = {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
};

export function ProfileTabs({ label, tabs }: { label: string; tabs: ProfileTab[] }) {
  return (
    <nav aria-label={label} className="mt-4 flex gap-1 border-t border-white/5 pt-3">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={[
            `inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-semibold transition ${focusRing}`,
            tab.active
              ? "bg-primary/15 text-primary-light"
              : "text-on-surface-muted hover:bg-surface-container-low hover:text-on-surface",
          ].join(" ")}
        >
          {tab.icon}
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
