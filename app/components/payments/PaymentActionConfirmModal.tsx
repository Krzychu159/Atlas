"use client";

import { AlertTriangle, CheckCircle2, ReceiptText, RotateCcw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { formatMoney } from "@/app/lib/formatters/money";
import type { PaymentDisplaySource } from "@/app/components/payments/PaymentDisplay";

type ConfirmTone = "primary" | "danger";

type PaymentActionConfirmModalProps = {
  payment: PaymentDisplaySource;
  title: string;
  description: string;
  confirmLabel: string;
  processing: boolean;
  tone?: ConfirmTone;
  icon?: "confirm" | "receipt" | "reverse";
  onClose: () => void;
  onConfirm: () => void;
};

export function PaymentActionConfirmModal({
  payment,
  title,
  description,
  confirmLabel,
  processing,
  tone = "primary",
  icon = "confirm",
  onClose,
  onConfirm,
}: PaymentActionConfirmModalProps) {
  const Icon =
    icon === "receipt" ? ReceiptText : icon === "reverse" ? RotateCcw : CheckCircle2;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient">
        <ModalHeader
          title={title}
          description={description}
          icon={<Icon size={19} />}
          iconTone={tone}
          onClose={onClose}
          className="p-5 md:p-6"
        />

        <div className="mx-5 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm md:mx-6">
          <p className="font-semibold text-on-surface">
            {payment.clientName || `Klient #${payment.clientId}`}
          </p>
          <p className="mt-1 text-on-surface-variant">
            {payment.packageName || "Bez przypisanego pakietu"} ·{" "}
            {formatMoney(payment.amount, payment.currency)}
          </p>
        </div>

        {tone === "danger" ? (
          <div className="mx-5 mt-3 flex gap-2 rounded-[var(--radius-lg)] bg-error-container/25 px-4 py-3 text-sm text-error-light md:mx-6">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>Ta operacja zapisze korektę w historii płatności.</p>
          </div>
        ) : null}

        <ModalFooter className="mt-5">
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Anuluj
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={processing}
            icon={<Icon size={16} />}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
