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
      <div className="flex flex-col gap-2 px-4 py-5 md:flex-row md:items-end md:justify-between md:px-5">
        <div>
          <p className="text-section-title">{title}</p>
          {description ? (
            <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
          ) : null}
        </div>
        {meta ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
            {meta}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
