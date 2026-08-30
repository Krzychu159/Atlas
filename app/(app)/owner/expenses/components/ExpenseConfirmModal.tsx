"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";

export default function ExpenseConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  isProcessing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <ModalOverlay onClose={isProcessing ? undefined : onClose}>
      <div className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient">
        <div className="p-5 md:p-6">
          <ModalHeader
            eyebrow="Potwierdzenie"
            title={title}
            description={description}
            icon={<AlertTriangle size={20} />}
            iconTone="danger"
            onClose={onClose}
          />
        </div>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? "Przetwarzanie..." : confirmLabel}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
