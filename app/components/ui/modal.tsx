"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { FieldDensityProvider } from "./field-density";

type ModalOverlayProps = {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
};

export function ModalOverlay({
  children,
  onClose,
  className,
}: ModalOverlayProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      data-atlas-modal=""
      className={[
        "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-contain bg-black/70 p-3 md:p-4 [&>*]:my-auto",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {onClose ? (
        <button
          type="button"
          aria-label="Zamknij"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />
      ) : null}
      <FieldDensityProvider value="compact">{children}</FieldDensityProvider>
    </div>
  );
}

type ModalHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconTone?: "primary" | "danger";
  onClose: () => void;
  className?: string;
};

export function ModalHeader({
  eyebrow,
  title,
  description,
  icon,
  iconTone = "primary",
  onClose,
  className,
}: ModalHeaderProps) {
  return (
    <div
      className={["flex items-start justify-between gap-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        {icon ? (
          <div
            className={[
              "mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] md:mb-4 md:h-11 md:w-11",
              iconTone === "danger"
                ? "bg-error-container text-on-error-container"
                : "bg-primary/15 text-primary-light",
            ].join(" ")}
          >
            {icon}
          </div>
        ) : null}
        {eyebrow ? (
          <p className="text-label text-primary-light">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 break-words text-lg font-semibold text-on-surface md:text-xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[560px] text-sm leading-5 text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      <ModalCloseButton onClose={onClose} />
    </div>
  );
}

export function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-muted transition hover:text-on-surface"
      aria-label="Zamknij"
    >
      <X size={18} />
    </button>
  );
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/5 bg-surface-container px-4 py-3 sm:flex-row sm:justify-end md:px-6 md:py-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
