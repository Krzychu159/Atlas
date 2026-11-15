type AtlasMarkProps = {
  className?: string;
};

// Colors come from the surrounding organization theme (--color-primary*).
export function AtlasMark({ className = "h-11 w-11" }: AtlasMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`atlas-mark relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[30%] text-white ${className}`}
    >
      <svg viewBox="0 0 32 32" fill="none" className="relative h-[62%] w-[62%]">
        <path d="M6.6 25.5 16 6.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M16 6.2 25.4 25.5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        <path
          d="M3.4 20.6c4.2-3.4 21-6.9 25.2-4.6"
          stroke="currentColor"
          strokeOpacity="0.72"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <circle cx="28.4" cy="16.1" r="1.45" fill="currentColor" />
      </svg>
    </span>
  );
}

type AtlasLogoProps = {
  subtitle?: string;
  size?: "sm" | "md";
};

export function AtlasLogo({ subtitle, size = "md" }: AtlasLogoProps) {
  const compact = size === "sm";
  return (
    <span className={`inline-flex min-w-0 items-center ${compact ? "gap-2.5" : "gap-3"}`}>
      <AtlasMark className={compact ? "h-8 w-8" : "h-11 w-11"} />
      <span className="flex min-w-0 flex-col">
        <span
          className={`font-display font-semibold uppercase leading-none text-on-surface ${compact ? "text-base tracking-[0.24em]" : "text-[1.3rem] tracking-[0.34em]"}`}
        >
          Atlas
        </span>
        {subtitle ? (
          <span className="atlas-logo-subtitle mt-1.5 truncate text-[0.625rem] font-medium uppercase leading-none tracking-[0.2em] text-on-surface-muted">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
