"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { profileSecondaryActionClassName } from "./profile-hero";

export type ProfileMoreMenuItem = {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

// Less frequent actions with bigger consequences live behind a labelled "Więcej" button.
export function ProfileMoreMenu({ items, label = "Więcej" }: { items: ProfileMoreMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (!items.length) return null;

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const options = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? (index + 1) % options.length : (index - 1 + options.length) % options.length;
    options[next]?.focus();
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={profileSecondaryActionClassName}
      >
        <MoreHorizontal size={15} className="text-primary-light" />
        {label}
        <ChevronDown size={14} className={`text-on-surface-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+0.375rem)] z-40 min-w-[220px] sm:left-auto sm:right-0 rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-high p-1.5 shadow-ambient"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onSelect(); }}
              className={[
                "flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 text-left text-sm font-semibold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                item.tone === "danger"
                  ? "text-error-light hover:bg-error-container/25 focus-visible:bg-error-container/25"
                  : "text-on-surface hover:bg-white/5 focus-visible:bg-white/5",
              ].join(" ")}
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
