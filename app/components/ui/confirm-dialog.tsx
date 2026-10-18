"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import { ModalFooter, ModalHeader, ModalOverlay } from "./modal";

// A confirmation window that cannot be closed while its action is running.
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busyLabel,
  icon,
  tone = "primary",
  busy,
  error,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  busyLabel: string;
  icon?: ReactNode;
  tone?: "primary" | "danger";
  busy: boolean;
  error?: string | null;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalOverlay onClose={busy ? undefined : onClose} closeDisabled={busy}>
      <div role="alertdialog" aria-modal="true" aria-label={title}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="p-5 md:p-6">
          <ModalHeader title={title} description={description} icon={icon} iconTone={tone} onClose={onClose} />
          {children ? <div className="mt-4">{children}</div> : null}
          {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
        </div>
        <ModalFooter>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Anuluj</Button>
          <Button type="button" variant={tone === "danger" ? "danger" : "primary"} disabled={busy}
            icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
