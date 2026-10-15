import type { ReactNode } from "react";

type ListSectionProps = {
  title: string;
  description?: string;
  meta?: ReactNode;
  children: ReactNode;
};

export function ListSection({ title, description, meta, children }: ListSectionProps) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft">
      <div className="flex items-end justify-between gap-2 px-4 py-3 md:py-5 md:px-5">
        <div>
          <p className="text-section-title">{title}</p>
          {description ? (
            <p className="mt-2 text-sm text-on-surface-variant max-md:hidden">{description}</p>
          ) : null}
        </div>
        {meta ? (
          <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
            {meta}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
