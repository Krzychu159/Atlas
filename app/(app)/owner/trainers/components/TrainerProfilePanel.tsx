import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function PanelHeader({
  icon,
  title,
  meta,
  href,
  linkLabel,
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-primary-light">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-on-surface">{title}</h2>
        {meta ? <p className="truncate text-xs text-on-surface-muted">{meta}</p> : null}
      </div>
      <Link
        href={href}
        prefetch={false}
        className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-primary-light transition hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none"
      >
        {linkLabel}
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

export function PanelEmpty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-surface-container-low px-3 py-4 text-sm text-on-surface-variant">
      <span className="shrink-0 text-primary-light">{icon}</span>
      {children}
    </div>
  );
}
