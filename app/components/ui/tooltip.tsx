import type { ReactNode } from "react";

type TooltipAlign = "start" | "center" | "end";

const alignClasses: Record<TooltipAlign, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

export function Tooltip({
  label,
  children,
  align = "center",
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  align?: TooltipAlign;
  className?: string;
}) {
  return (
    <span className={["group/tooltip relative inline-flex", className].filter(Boolean).join(" ")}>
      {children}
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute top-full z-30 mt-2 w-max max-w-72 rounded-[var(--radius-md)] bg-surface-container-high px-3 py-2 text-left text-xs font-medium leading-5 text-on-surface opacity-0 shadow-soft ring-1 ring-white/5 transition-opacity duration-150",
          "group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          alignClasses[align],
        ].join(" ")}
      >
        {label}
      </span>
    </span>
  );
}
