import type { ReactNode } from "react";

export default function SessionMetaChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "primary" | "neutral" | "success";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/15 text-primary-light"
      : tone === "success"
        ? "bg-tertiary-container/25 text-tertiary-light"
        : "bg-surface-container text-on-surface-variant";

  return (
    <span
      className={[
        "flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2",
        toneClass,
      ].join(" ")}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-70">
          {label}
        </span>
        <span className="block truncate text-xs font-semibold">{value}</span>
      </span>
    </span>
  );
}
