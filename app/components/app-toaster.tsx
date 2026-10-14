"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

export function AppToaster({ organizationPanel = false }: { organizationPanel?: boolean }) {
  const pathname = usePathname();
  // The path selects the host only. Branding comes from the verified panel scope.
  const hasPanelHost = /^\/(owner|trainer|client)(?:\/|$)/.test(pathname);
  if (!organizationPanel && hasPanelHost) return null;
  return (
    <Toaster
      position="top-right"
      theme="dark"
      closeButton
      expand
      visibleToasts={4}
      gap={12}
      offset={{ top: 18, right: 18 }}
      mobileOffset={{ top: 76, right: 16, left: 16 }}
      toastOptions={{
        duration: 4200,
        unstyled: true,
        classNames: {
          toast:
            "flex min-h-[68px] w-[min(390px,calc(100vw-32px))] items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-high p-4 pr-12 text-on-surface shadow-ambient",
          title: "text-sm font-bold leading-snug text-on-surface",
          description:
            "mt-1 text-xs leading-relaxed text-on-surface-variant",
          content: "min-w-0 flex-1",
          icon: "shrink-0 text-info-light",
          closeButton:
            "absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-default)] bg-surface-container-lowest text-on-surface-muted transition hover:text-on-surface",
          success: "border-l-4 border-l-tertiary-light",
          error: "border-l-4 border-l-error-light",
          warning: "border-l-4 border-l-warning-light",
          info: "border-l-4 border-l-info-light",
          loading: "border-l-4 border-l-info-light",
          actionButton:
            "h-9 rounded-[var(--radius-default)] bg-primary px-3 text-xs font-bold text-on-primary",
          cancelButton:
            "h-9 rounded-[var(--radius-default)] bg-surface-container-lowest px-3 text-xs font-bold text-on-surface-variant",
        },
      }}
    />
  );
}
