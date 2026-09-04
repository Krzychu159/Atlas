"use client";

import { useState, type FormEvent } from "react";
import { Building2, Info, Plus, Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import {
  createLegalEntity,
  updateLegalEntity,
  type LegalEntity,
  type LegalEntityPayload,
} from "@/app/lib/owner/payment-configuration";

type CompanyFormModalProps = {
  entity: LegalEntity | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

type CompanyForm = Omit<LegalEntityPayload, "isActive"> & {
  isActive: boolean;
};

const emptyForm: CompanyForm = {
  name: "",
  nip: "",
  address: "",
  email: "",
  phone: "",
  paymentRecipientName: "",
  bankAccountNumber: "",
  blikPhoneNumber: "",
  transferTitleTemplate: "Pakiet {PackageName} - {ClientFullName}",
  paymentDescription: "",
  isActive: true,
};

export default function CompanyFormModal({
  entity,
  onClose,
  onSaved,
}: CompanyFormModalProps) {
  const [form, setForm] = useState<CompanyForm>(() => toForm(entity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = entity !== null;

  function handleClose() {
    if (!isSaving) onClose();
  }

  function updateField<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSaving(true);
      const payload = toPayload(form);

      if (entity) await updateLegalEntity(entity.id, payload);
      else await createLegalEntity(payload);

      await onSaved();
      showAppSuccess(
        entity ? "Dane firmy zostały zapisane." : "Nowa firma została dodana.",
        { id: entity ? `company-updated-${entity.id}` : "company-created" },
      );
      onClose();
    } catch (error) {
      showAppError(
        error,
        entity ? "Nie udało się zapisać danych firmy." : "Nie udało się dodać firmy.",
        { id: entity ? `company-update-error-${entity.id}` : "company-create-error" },
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={isSaving ? undefined : handleClose} className="items-start overflow-y-auto py-5 md:py-8">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative z-10 w-full max-w-[820px] overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-surface-container shadow-ambient"
      >
        <div className="p-5 md:p-6">
          <ModalHeader
            eyebrow="Ustawienia firmy"
            title={isEditing ? "Edytuj dane firmy" : "Dodaj nową firmę"}
            description="Dane rozliczeniowe i instrukcje płatności używane przez przypisane lokalizacje."
            icon={isEditing ? <Building2 size={21} /> : <Plus size={21} />}
            onClose={handleClose}
          />

          {/* Sekcja: Podstawowe dane firmy */}
          <fieldset className="mt-7 border-t border-white/5 pt-6">
            <legend className="pr-3 text-label text-primary-light">Dane podstawowe</legend>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FieldWithError error={errors.name} className="md:col-span-2">
                <TextField
                  label="Nazwa firmy"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                  placeholder="np. BS Workout Kłaj"
                  autoComplete="organization"
                  required
                />
              </FieldWithError>
              <FieldWithError error={errors.nip}>
                <TextField
                  label="NIP"
                  value={form.nip}
                  onChange={(value) => updateField("nip", onlyDigits(value).slice(0, 10))}
                  placeholder="10 cyfr"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  aria-invalid={Boolean(errors.nip)}
                />
              </FieldWithError>
              <FieldWithError error={errors.email}>
                <TextField
                  label="E-mail firmy"
                  value={form.email}
                  onChange={(value) => updateField("email", value)}
                  placeholder="kontakt@firma.pl"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
              </FieldWithError>
              <FieldWithError error={errors.phone}>
                <TextField
                  label="Telefon"
                  value={form.phone}
                  onChange={(value) => updateField("phone", sanitizePhone(value))}
                  placeholder="+48 500 000 000"
                  type="tel"
                  autoComplete="tel"
                  maxLength={18}
                  aria-invalid={Boolean(errors.phone)}
                />
              </FieldWithError>
              <TextField
                label="Adres"
                value={form.address}
                onChange={(value) => updateField("address", value)}
                placeholder="ul. Sportowa 4, Kłaj"
                autoComplete="street-address"
                className="md:col-span-2"
              />
            </div>
          </fieldset>

          {/* Sekcja: Dane płatności firmy */}
          <fieldset className="mt-7 border-t border-white/5 pt-6">
            <legend className="pr-3 text-label text-primary-light">Dane płatności</legend>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField
                label="Odbiorca płatności"
                value={form.paymentRecipientName}
                onChange={(value) => updateField("paymentRecipientName", value)}
                placeholder="Nazwa widoczna w instrukcji płatności"
              />
              <FieldWithError error={errors.bankAccountNumber}>
                <TextField
                  label="Numer rachunku bankowego"
                  value={form.bankAccountNumber}
                  onChange={(value) => updateField("bankAccountNumber", formatBankAccount(value))}
                  placeholder="26 cyfr, spacje są dozwolone"
                  inputMode="numeric"
                  aria-invalid={Boolean(errors.bankAccountNumber)}
                />
              </FieldWithError>
              <FieldWithError error={errors.blikPhoneNumber}>
                <TextField
                  label="Telefon BLIK"
                  value={form.blikPhoneNumber}
                  onChange={(value) => updateField("blikPhoneNumber", onlyDigits(value).slice(0, 9))}
                  placeholder="9 cyfr"
                  inputMode="numeric"
                  maxLength={9}
                  aria-invalid={Boolean(errors.blikPhoneNumber)}
                />
              </FieldWithError>
              <div>
                <TextField
                  label="Szablon tytułu przelewu"
                  value={form.transferTitleTemplate}
                  onChange={(value) => updateField("transferTitleTemplate", value)}
                  placeholder="Pakiet {PackageName} - {ClientFullName}"
                />
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-on-surface-muted">
                  <Info size={14} className="mt-0.5 shrink-0 text-primary-light" />
                  <span>
                    <code className="text-primary-light">{"{PackageName}"}</code> wstawia nazwę
                    pakietu, a <code className="text-primary-light">{"{ClientFullName}"}</code>{" "}
                    pełne imię i nazwisko klienta.
                  </span>
                </p>
              </div>
              <TextArea
                label="Opis płatności"
                value={form.paymentDescription}
                onChange={(value) => updateField("paymentDescription", value)}
                placeholder="Instrukcja widoczna dla klienta..."
                rows={3}
                className="md:col-span-2"
              />
            </div>
          </fieldset>

          {/* Sekcja: Status firmy */}
          <div className="mt-6 flex items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <div>
              <p className="text-sm font-semibold text-on-surface">Aktywna firma</p>
              <p className="mt-1 text-xs leading-5 text-on-surface-muted">
                Nieaktywna firma pozostaje w konfiguracji, ale nie powinna być używana dla nowych danych.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => updateField("isActive", !form.isActive)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] ${
                form.isActive ? "bg-primary" : "bg-surface-bright"
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
                  form.isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
              <span className="sr-only">Zmień aktywność firmy</span>
            </button>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            Anuluj
          </Button>
          <Button type="submit" icon={<Save size={16} />} disabled={isSaving}>
            {isSaving ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj firmę"}
          </Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}

function FieldWithError({
  error,
  className,
  children,
}: {
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {children}
      {error ? <p className="mt-2 text-xs font-semibold text-error-light">{error}</p> : null}
    </div>
  );
}

function toForm(entity: LegalEntity | null): CompanyForm {
  if (!entity) return emptyForm;

  return {
    name: entity.name || "",
    nip: onlyDigits(entity.nip || "").slice(0, 10),
    address: entity.address || "",
    email: entity.email || "",
    phone: entity.phone || "",
    paymentRecipientName: entity.paymentRecipientName || "",
    bankAccountNumber: entity.bankAccountNumber || "",
    blikPhoneNumber: onlyDigits(entity.blikPhoneNumber || "").slice(0, 9),
    transferTitleTemplate: entity.transferTitleTemplate || "",
    paymentDescription: entity.paymentDescription || "",
    isActive: entity.isActive,
  };
}

function toPayload(form: CompanyForm): LegalEntityPayload {
  return {
    name: form.name.trim(),
    nip: onlyDigits(form.nip),
    address: form.address.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    paymentRecipientName: form.paymentRecipientName.trim(),
    bankAccountNumber: form.bankAccountNumber.trim(),
    blikPhoneNumber: onlyDigits(form.blikPhoneNumber),
    transferTitleTemplate: form.transferTitleTemplate.trim(),
    paymentDescription: form.paymentDescription.trim(),
    isActive: form.isActive,
  };
}

function validateForm(form: CompanyForm) {
  const errors: Record<string, string> = {};
  const nip = onlyDigits(form.nip);
  const bankAccount = onlyDigits(form.bankAccountNumber);
  const phone = onlyDigits(form.phone);
  const blikPhone = onlyDigits(form.blikPhoneNumber);

  if (!form.name.trim()) errors.name = "Podaj nazwę firmy.";
  if (nip.length !== 10) errors.nip = "NIP musi zawierać dokładnie 10 cyfr.";
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "Podaj poprawny adres e-mail.";
  }
  if (phone && !isValidPhoneNumber(phone)) {
    errors.phone = "Podaj 9-cyfrowy numer lub numer z prefiksem +48.";
  }
  if (bankAccount && bankAccount.length !== 26) {
    errors.bankAccountNumber = "Numer rachunku musi zawierać 26 cyfr.";
  }
  if (blikPhone && blikPhone.length !== 9) {
    errors.blikPhoneNumber = "Numer telefonu BLIK musi zawierać 9 cyfr.";
  }

  return errors;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizePhone(value: string) {
  return value.replace(/[^\d+()\s-]/g, "");
}

function isValidPhoneNumber(value: string) {
  return value.length === 9 || (value.length === 11 && value.startsWith("48"));
}

function formatBankAccount(value: string) {
  const digits = onlyDigits(value).slice(0, 26);
  if (digits.length <= 2) return digits;

  const groups = digits.slice(2).match(/.{1,4}/g) || [];
  return [digits.slice(0, 2), ...groups].join(" ");
}
