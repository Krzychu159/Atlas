"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function ClientProfileCollapsible({
  title,
  icon,
  meta,
  children,
}: {
  title: string;
  icon: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <section className="card-shell min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-left transition hover:bg-surface-container-high/50 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_35%,transparent)] md:px-5"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-primary-light">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">{title}</span>
        {meta !== undefined && meta !== null ? (
          <span className="shrink-0 text-xs text-on-surface-muted">{meta}</span>
        ) : null}
        <ChevronDown
          size={16}
          className={`shrink-0 text-on-surface-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div id={contentId} className="min-w-0 border-t border-white/5 p-4 md:p-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
