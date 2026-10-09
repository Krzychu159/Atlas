"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function SessionAccordion({ title, summary, children }: { title: string; summary?: ReactNode; children: ReactNode | (() => ReactNode) }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <details
      open={expanded}
      onToggle={event => setExpanded(event.currentTarget.open)}
      onInvalidCapture={event => { event.currentTarget.open = true; setExpanded(true); }}
      className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 font-semibold">{title}</span>
        {summary != null ? <span className="shrink-0 text-xs text-on-surface-variant">{summary}</span> : null}
        <ChevronDown size={16} aria-hidden="true" className={"shrink-0 text-primary-light transition-transform" + (expanded ? " rotate-180" : "")} />
      </summary>
      <div className="min-w-0 px-4 pb-4">{typeof children === "function" ? expanded ? children() : null : children}</div>
    </details>
  );
}
