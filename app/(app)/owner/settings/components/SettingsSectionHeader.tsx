import type { ReactNode } from "react";

type SettingsSectionHeaderProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function SettingsSectionHeader({
  icon,
  title,
  description,
  action,
}: SettingsSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
          {icon}
        </span>
        <div className="min-w-0 pt-1">
          <h2 className="text-section-title">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-[760px] text-sm leading-6 text-on-surface-variant">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
