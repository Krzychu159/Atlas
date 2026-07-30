"use client";

import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { formatMoney } from "@/app/lib/formatters/money";
import type { PaymentDisplaySource } from "@/app/components/payments/PaymentDisplay";

type PaymentReasonModalProps = {
  payment: PaymentDisplaySource;
  title: string;
  description: string;
  reasonLabel: string;
  reason: string;
  placeholder: string;
  confirmLabel: string;
  processing: boolean;
  action: "reject" | "reverse";
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function PaymentReasonModal({
  payment,
  title,
  description,
  reasonLabel,
  reason,
  placeholder,
  confirmLabel,
  processing,
  action,
  onReasonChange,
  onClose,
  onConfirm,
}: PaymentReasonModalProps) {
  const Icon = action === "reject" ? XCircle : RotateCcw;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader
            title={title}
            description={description}
            icon={<Icon size={19} />}
            iconTone="danger"
            onClose={onClose}
          />

          <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm">
            <p className="font-semibold text-on-surface">
              {payment.clientName || `Klient #${payment.clientId}`}
            </p>
            <p className="mt-1 text-on-surface-variant">
              {formatMoney(payment.amount, payment.currency)} ·{" "}
              {payment.packageName || "Bez przypisanego pakietu"}
            </p>
          </div>

          {action === "reverse" ? (
            <div className="mt-3 flex gap-2 rounded-[var(--radius-lg)] bg-error-container/25 px-4 py-3 text-sm text-error-light">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>
                Cofnięcie zapisze korektę w historii i odwróci rozliczenie
                pakietu oraz ewentualnej nadpłaty.
              </p>
            </div>
          ) : null}

          <TextArea
            label={reasonLabel}
            value={reason}
            onChange={onReasonChange}
            rows={4}
            className="mt-5"
            placeholder={placeholder}
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Anuluj
          </Button>
          <Button
            variant="danger"
            icon={<Icon size={16} />}
            onClick={onConfirm}
            disabled={processing}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
