"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

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
      className={[
        "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4",
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
      {children}
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
              "mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)]",
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
        <h2 className="mt-2 text-2xl font-semibold text-on-surface">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-[560px] text-sm leading-6 text-on-surface-variant">
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
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-muted transition hover:text-on-surface"
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
        "sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/5 bg-surface-container px-5 py-4 sm:flex-row sm:justify-end md:px-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
