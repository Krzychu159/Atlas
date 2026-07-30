"use client";

import { FormEvent } from "react";
import { CheckCircle2, Landmark, ReceiptText } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  CustomSelect,
  type SelectOption,
} from "@/app/components/ui/custom-select";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { formatMoney } from "@/app/lib/formatters/money";

export type PaymentPackageOption = SelectOption & {
  amountDue?: number | null;
  currency?: string | null;
};

type PaymentEntryModalProps = {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  amount: string;
  packageId: string;
  method: string;
  note: string;
  packageOptions: PaymentPackageOption[];
  methodOptions: SelectOption[];
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  emptyPackagesMessage: string;
  notePlaceholder?: string;
  onAmountChange: (value: string) => void;
  onPackageChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function PaymentEntryModal({
  open,
  eyebrow,
  title,
  description,
  amount,
  packageId,
  method,
  note,
  packageOptions,
  methodOptions,
  isSubmitting,
  submitLabel,
  submittingLabel,
  emptyPackagesMessage,
  notePlaceholder = "Np. przelew za aktywny pakiet",
  onAmountChange,
  onPackageChange,
  onMethodChange,
  onNoteChange,
  onClose,
  onSubmit,
}: PaymentEntryModalProps) {
  if (!open) return null;

  const selectedPackage = packageOptions.find(
    (option) => option.value === packageId,
  );
  const parsedAmount = Number(amount.replace(",", "."));
  const amountDue = selectedPackage?.amountDue ?? 0;
  const currency = selectedPackage?.currency || "PLN";
  const overpayment =
    Number.isFinite(parsedAmount) && parsedAmount > amountDue
      ? parsedAmount - amountDue
      : 0;
  const selectPackageOptions = packageOptions.length
    ? [{ value: "", label: "Wybierz pakiet" }, ...packageOptions]
    : [{ value: "", label: "Brak pakietu do wyboru" }];
  const canSubmit =
    packageOptions.length > 0 &&
    Boolean(packageId) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !isSubmitting;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <ModalOverlay onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-[92vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient"
      >
        <ModalHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          onClose={onClose}
          className="px-5 pt-5 md:px-6 md:pt-6"
        />

        <div className="mt-5 flex-1 overflow-y-auto px-5 pb-5 md:px-6">
          {!packageOptions.length ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
              {emptyPackagesMessage}
            </div>
          ) : null}

          <div className="grid gap-4">
            <TextField
              label="Kwota"
              value={amount}
              onChange={onAmountChange}
              inputMode="decimal"
              placeholder="0,00"
            />

            <CustomSelect
              label="Pakiet"
              value={packageId}
              onChange={onPackageChange}
              options={selectPackageOptions}
              icon={<ReceiptText size={16} />}
            />

            {selectedPackage && parsedAmount > 0 ? (
              <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm leading-6">
                <span className="text-on-surface-variant">Wpłata </span>
                <strong className="text-on-surface">
                  {formatMoney(parsedAmount, currency)}
                </strong>
                {overpayment > 0 ? (
                  <strong className="ml-2 text-tertiary-light">
                    (+{formatMoney(overpayment, currency)})
                  </strong>
                ) : null}
                {overpayment > 0 ? (
                  <p className="mt-1 text-xs font-semibold text-tertiary-light">
                    Nadpłata zasili saldo klienta i obniży kolejny pakiet.
                  </p>
                ) : null}
              </div>
            ) : null}

            <CustomSelect
              label="Metoda"
              value={method}
              onChange={onMethodChange}
              options={methodOptions}
              icon={<Landmark size={16} />}
            />

            <TextArea
              label="Notatka"
              value={note}
              onChange={onNoteChange}
              rows={3}
              placeholder={notePlaceholder}
              className="[&_textarea]:min-h-[96px] [&_textarea]:resize-y"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Zamknij
          </Button>
          <Button
            type="submit"
            icon={<CheckCircle2 size={16} />}
            disabled={!canSubmit}
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
