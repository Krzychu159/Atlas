"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
};

export function CustomSelect({
  label,
  value,
  options,
  onChange,
  icon,
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className={["relative", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "flex h-12 w-full items-center gap-3 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-3 text-left transition",
          "hover:border-white/10 hover:bg-surface-container-low focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_24%,transparent)]",
          isOpen ? "border-primary-light/40 bg-surface-container-low" : "",
        ].join(" ")}
      >
        {icon ? <span className="shrink-0 text-on-surface-muted">{icon}</span> : null}
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
              {label}
            </span>
          ) : null}
          <span className="block truncate text-sm font-semibold text-on-surface">
            {selectedOption?.label}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={[
            "shrink-0 text-on-surface-muted transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 max-h-72 w-full overflow-y-auto rounded-[var(--radius-lg)] border border-white/10 bg-surface-container p-1.5 shadow-ambient">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={[
                  "flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-md)] px-3 text-left text-sm transition",
                  active
                    ? "bg-surface-container-high text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                ].join(" ")}
              >
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {option.label}
                </span>
                {active ? <Check size={15} className="shrink-0 text-primary-light" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
