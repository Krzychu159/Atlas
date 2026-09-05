"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Paperclip,
  ReceiptText,
  Repeat2,
  Save,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  CustomSelect,
  type SelectOption,
} from "@/app/components/ui/custom-select";
import { DateInput } from "@/app/components/ui/date-input";
import { TextArea, TextField } from "@/app/components/ui/input";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";
import { formatMoney } from "@/app/lib/formatters/money";
import type { Location } from "@/app/lib/owner/locations";
import {
  createExpense,
  updateExpense,
  uploadExpenseAttachment,
  type CompanyExpense,
  type ExpensePayload,
} from "@/app/lib/owner/expenses";
import {
  showOwnerError,
  showOwnerSuccess,
} from "@/app/(app)/owner/components/owner-toast";
import {
  toDateValue,
  type DictionaryOption,
  type LegalEntityOption,
} from "../expense-config";

type ExpenseForm = {
  legalEntityId: string;
  locationId: string;
  category: string;
  paymentStatus: string;
  vendorName: string;
  vendorNip: string;
  invoiceNumber: string;
  issueDate: string;
  saleDate: string;
  dueDate: string;
  paidAt: string;
  amountMode: "net" | "gross";
  amount: string;
  vatRate: string;
  currency: string;
  description: string;
  notes: string;
  isRecurring: boolean;
  recurrenceEndMode: "unchanged" | "count" | "date";
  recurrenceEndDate: string;
  recurringOccurrencesCount: string;
  recurrenceEditScope: string;
};

type ExpenseFormModalProps = {
  open: boolean;
  expense: CompanyExpense | null;
  categories: DictionaryOption[];
  paymentStatuses: DictionaryOption[];
  recurrenceEditScopes: DictionaryOption[];
  legalEntities: LegalEntityOption[];
  locations: Location[];
  defaultRecurring?: boolean;
  onClose: () => void;
  onSaved: (expense: CompanyExpense) => void;
};

const acceptedAttachmentTypes = "application/pdf,image/jpeg,image/png,image/webp";

export default function ExpenseFormModal({
  open,
  expense,
  categories,
  paymentStatuses,
  recurrenceEditScopes,
  legalEntities,
  locations,
  defaultRecurring = false,
  onClose,
  onSaved,
}: ExpenseFormModalProps) {
  const [form, setForm] = useState<ExpenseForm>(() => createEmptyForm());
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    void Promise.resolve().then(() => {
      setForm(
        expense
          ? toExpenseForm(expense)
          : createEmptyForm(legalEntities, defaultRecurring),
      );
      setAttachmentFile(null);
    });
  }, [defaultRecurring, expense, legalEntities, open]);

  if (!open) return null;

  const amounts = calculateAmounts(form.amount, form.vatRate, form.amountMode);
  const nipError = getNipError(form.vendorNip);
  const visibleLocations = locations.filter(
    (location) =>
      !location.legalEntityId ||
      !form.legalEntityId ||
      String(location.legalEntityId) === form.legalEntityId,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = toExpensePayload(form, expense);

    if (!payload) {
      showOwnerError(
        new Error(
          nipError ||
            "Uzupełnij działalność, kontrahenta, datę wystawienia oraz poprawne kwoty.",
        ),
        "Uzupełnij wymagane pola.",
        { id: "expense-form-invalid" },
      );
      return;
    }

    try {
      setIsSaving(true);
      let saved = expense
        ? await updateExpense(expense.id, payload)
        : await createExpense(payload);

      if (attachmentFile) {
        saved = await uploadExpenseAttachment(saved.id, attachmentFile);
      }

      onSaved(saved);
      showOwnerSuccess(
        expense ? "Wydatek został zaktualizowany." : "Wydatek został dodany.",
        { id: expense ? "expense-update-success" : "expense-create-success" },
      );
      onClose();
    } catch (error) {
      showOwnerError(
        error,
        expense
          ? "Nie udało się zaktualizować wydatku."
          : "Nie udało się dodać wydatku.",
        { id: expense ? "expense-update-error" : "expense-create-error" },
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setAttachmentFile(file);
  }

  function handleAttachmentDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) setAttachmentFile(file);
  }

  return (
    <ModalOverlay onClose={isSaving ? undefined : onClose} className="py-6">
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-full w-full max-w-[960px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader
            eyebrow={expense ? "Edycja dokumentu" : "Nowy dokument"}
            title={expense ? "Edytuj wydatek" : "Dodaj wydatek"}
            description="Zarejestruj koszt firmy i przypisz go do właściwej działalności oraz lokalizacji."
            icon={<ReceiptText size={20} />}
            onClose={onClose}
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="flex flex-col gap-5">
              <FormSection
                icon={<Building2 size={16} />}
                title="Informacje podstawowe"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {legalEntities.length ? (
                    <SelectField
                      label="Działalność"
                      value={form.legalEntityId}
                      options={legalEntities.map((entity) => ({
                        value: String(entity.id),
                        label: entity.name,
                      }))}
                      onChange={(legalEntityId) =>
                        setForm((current) => ({
                          ...current,
                          legalEntityId,
                          locationId: isLocationValidForEntity(
                            current.locationId,
                            legalEntityId,
                            locations,
                          )
                            ? current.locationId
                            : "",
                        }))
                      }
                    />
                  ) : (
                    <TextField
                      label="ID działalności"
                      type="number"
                      min={1}
                      step={1}
                      value={form.legalEntityId}
                      onChange={(legalEntityId) =>
                        updateForm(setForm, "legalEntityId", legalEntityId)
                      }
                      placeholder="np. 1"
                    />
                  )}

                  <SelectField
                    label="Lokalizacja"
                    value={form.locationId}
                    options={[
                      { value: "", label: "Bez lokalizacji" },
                      ...visibleLocations.map((location) => ({
                        value: String(location.id),
                        label: location.name || location.city || `#${location.id}`,
                      })),
                    ]}
                    onChange={(locationId) =>
                      updateForm(setForm, "locationId", locationId)
                    }
                  />

                  <TextField
                    label="Kontrahent"
                    value={form.vendorName}
                    onChange={(vendorName) =>
                      updateForm(setForm, "vendorName", vendorName)
                    }
                    placeholder="Nazwa sprzedawcy"
                    className="sm:col-span-2"
                  />
                  <div>
                    <TextField
                      label="NIP"
                      value={form.vendorNip}
                      onChange={(vendorNip) =>
                        updateForm(
                          setForm,
                          "vendorNip",
                          vendorNip.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      aria-invalid={Boolean(nipError)}
                      aria-describedby={
                        nipError ? "expense-nip-error" : undefined
                      }
                      placeholder="5261040828"
                    />
                    {nipError ? (
                      <p
                        id="expense-nip-error"
                        className="mt-1.5 text-xs font-medium text-error"
                      >
                        {nipError}
                      </p>
                    ) : null}
                  </div>
                  <TextField
                    label="Numer faktury"
                    value={form.invoiceNumber}
                    onChange={(invoiceNumber) =>
                      updateForm(setForm, "invoiceNumber", invoiceNumber)
                    }
                    placeholder="FV/08/2026/12"
                  />
                  <SelectField
                    label="Kategoria"
                    value={form.category}
                    options={categories.map((category) => ({
                      value: String(category.value),
                      label: category.label,
                    }))}
                    onChange={(category) =>
                      updateForm(setForm, "category", category)
                    }
                  />
                  <SelectField
                    label="Status płatności"
                    value={form.paymentStatus}
                    options={paymentStatuses.map((status) => ({
                      value: String(status.value),
                      label: status.label,
                    }))}
                    onChange={(paymentStatus) =>
                      updateForm(setForm, "paymentStatus", paymentStatus)
                    }
                  />
                </div>
              </FormSection>

              <FormSection
                icon={<WalletCards size={16} />}
                title="Kwoty i daty"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DateInput
                    label="Data wystawienia"
                    value={form.issueDate}
                    onChange={(issueDate) =>
                      updateForm(setForm, "issueDate", issueDate)
                    }
                  />
                  <DateInput
                    label="Data sprzedaży"
                    value={form.saleDate}
                    onChange={(saleDate) =>
                      updateForm(setForm, "saleDate", saleDate)
                    }
                  />
                  <DateInput
                    label="Termin płatności"
                    value={form.dueDate}
                    onChange={(dueDate) =>
                      updateForm(setForm, "dueDate", dueDate)
                    }
                  />
                </div>

                <div className="mt-5 rounded-[var(--radius-xl)] bg-surface-container-lowest p-4">
                  <p className="text-label text-on-surface-muted">
                    Wprowadzana kwota
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-[var(--radius-lg)] bg-surface-container-high p-1">
                    <AmountModeButton
                      active={form.amountMode === "net"}
                      onClick={() => changeAmountMode(setForm, "net")}
                    >
                      Netto
                    </AmountModeButton>
                    <AmountModeButton
                      active={form.amountMode === "gross"}
                      onClick={() => changeAmountMode(setForm, "gross")}
                    >
                      Brutto
                    </AmountModeButton>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_160px_120px]">
                    <TextField
                      label={
                        form.amountMode === "net"
                          ? "Kwota netto"
                          : "Kwota brutto"
                      }
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.amount}
                      onChange={(amount) =>
                        updateForm(setForm, "amount", amount)
                      }
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                    <TextField
                      label="Stawka VAT (%)"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={form.vatRate}
                      onChange={(vatRate) =>
                        updateForm(setForm, "vatRate", vatRate)
                      }
                      inputMode="decimal"
                      placeholder="23"
                    />
                    <TextField
                      label="Waluta"
                      value={form.currency}
                      onChange={(currency) =>
                        updateForm(setForm, "currency", currency.toUpperCase())
                      }
                      maxLength={3}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <AmountSummary
                    label="Netto"
                    value={amounts.netAmount}
                    currency={form.currency}
                  />
                  <AmountSummary
                    label={`VAT ${formatVatRate(form.vatRate)}%`}
                    value={amounts.vatAmount}
                    currency={form.currency}
                  />
                  <AmountSummary
                    label="Brutto"
                    value={amounts.grossAmount}
                    currency={form.currency}
                    highlighted
                  />
                </div>

                {form.paymentStatus === "1" ? (
                  <DateInput
                    label="Data opłacenia"
                    value={form.paidAt}
                    onChange={(paidAt) =>
                      updateForm(setForm, "paidAt", paidAt)
                    }
                    wrapperClassName="mt-4 max-w-[280px]"
                  />
                ) : null}
              </FormSection>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextArea
                  label="Opis"
                  value={form.description}
                  onChange={(description) =>
                    updateForm(setForm, "description", description)
                  }
                  rows={3}
                  placeholder="Czego dotyczy wydatek?"
                />
                <TextArea
                  label="Notatki wewnętrzne"
                  value={form.notes}
                  onChange={(notes) => updateForm(setForm, "notes", notes)}
                  rows={3}
                  placeholder="Dodatkowe informacje dla zespołu"
                />
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="rounded-[var(--radius-xl)] bg-surface-container-low p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary-light">
                      <Repeat2 size={16} />
                      <p className="text-label">Płatność cykliczna</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-on-surface-muted">
                      Automatycznie utwórz miesięczne wydatki na podstawie tego dokumentu.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isRecurring}
                    aria-label="Włącz płatność cykliczną"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        isRecurring: !current.isRecurring,
                        recurrenceEndMode: !current.isRecurring
                          ? current.recurrenceEndMode === "unchanged"
                            ? "count"
                            : current.recurrenceEndMode
                          : current.recurrenceEndMode,
                      }))
                    }
                    className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] ${
                      form.isRecurring ? "bg-primary" : "bg-surface-bright"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
                        form.isRecurring ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {form.isRecurring ? (
                  <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
                    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 py-2.5">
                      <p className="text-xs font-semibold text-on-surface">
                        Co miesiąc, {formatRecurrenceDay(form.issueDate)}
                      </p>
                      <p className="mt-1 text-[0.7rem] leading-4 text-on-surface-muted">
                        Każde wystąpienie będzie osobnym, edytowalnym wydatkiem.
                      </p>
                    </div>

                    <SelectField
                      label="Zakończenie serii"
                      value={form.recurrenceEndMode}
                      options={[
                        ...(expense?.isRecurring
                          ? [{ value: "unchanged", label: "Bez zmiany" }]
                          : []),
                        { value: "count", label: "Po określonej liczbie" },
                        { value: "date", label: "W wybranym dniu" },
                      ]}
                      onChange={(recurrenceEndMode) =>
                        updateForm(
                          setForm,
                          "recurrenceEndMode",
                          recurrenceEndMode as ExpenseForm["recurrenceEndMode"],
                        )
                      }
                    />

                    {form.recurrenceEndMode === "count" ? (
                      <TextField
                        label="Liczba płatności"
                        type="number"
                        min={2}
                        max={120}
                        step={1}
                        value={form.recurringOccurrencesCount}
                        onChange={(recurringOccurrencesCount) =>
                          updateForm(
                            setForm,
                            "recurringOccurrencesCount",
                            recurringOccurrencesCount,
                          )
                        }
                      />
                    ) : null}

                    {form.recurrenceEndMode === "date" ? (
                      <DateInput
                        label="Data zakończenia"
                        min={form.issueDate}
                        value={form.recurrenceEndDate}
                        onChange={(recurrenceEndDate) =>
                          updateForm(setForm, "recurrenceEndDate", recurrenceEndDate)
                        }
                      />
                    ) : null}

                    {expense?.isRecurring ? (
                      <SelectField
                        label="Zakres zmian"
                        value={form.recurrenceEditScope}
                        options={recurrenceEditScopes.map((scope) => ({
                          value: String(scope.value),
                          label: scope.label,
                        }))}
                        onChange={(recurrenceEditScope) =>
                          updateForm(setForm, "recurrenceEditScope", recurrenceEditScope)
                        }
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-label text-on-surface-muted">Załącznik</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleAttachmentDrop}
                  className="mt-2 flex min-h-44 w-full flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-white/15 bg-surface-container-lowest p-5 text-center transition hover:border-primary-light/40 hover:bg-surface-container-low"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary-light">
                    <UploadCloud size={21} />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-on-surface">
                    {attachmentFile
                      ? attachmentFile.name
                      : expense?.attachmentFileName || "Dodaj fakturę"}
                  </span>
                  <span className="mt-1 text-xs leading-5 text-on-surface-muted">
                    Kliknij albo przeciągnij PDF lub zdjęcie
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedAttachmentTypes}
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
                {attachmentFile ? (
                  <button
                    type="button"
                    onClick={() => setAttachmentFile(null)}
                    className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-on-surface-muted transition hover:text-on-surface"
                  >
                    <Paperclip size={13} />
                    Usuń wybrany plik
                  </button>
                ) : null}
              </div>

            </aside>
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Anuluj
          </Button>
          <Button type="submit" disabled={isSaving} icon={<Save size={16} />}>
            {isSaving
              ? "Zapisywanie..."
              : expense
                ? "Zapisz zmiany"
                : "Dodaj wydatek"}
          </Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-xl)] bg-surface-container-low p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2 text-primary-light">
        {icon}
        <p className="text-label">{title}</p>
      </div>
      {children}
    </section>
  );
}

function SelectField({
  label,
  ...props
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-label text-on-surface-muted">{label}</p>
      <CustomSelect {...props} className="mt-2" />
    </div>
  );
}

function AmountModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "h-10 rounded-[var(--radius-md)] text-sm font-semibold transition",
        active
          ? "bg-primary text-on-primary shadow-sm"
          : "text-on-surface-muted hover:bg-white/5 hover:text-on-surface",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function AmountSummary({
  label,
  value,
  currency,
  highlighted = false,
}: {
  label: string;
  value: number;
  currency: string;
  highlighted?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-high p-3">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p
        className={[
          "mt-1 text-base font-semibold",
          highlighted ? "text-tertiary-light" : "text-on-surface",
        ].join(" ")}
      >
        {formatMoney(value, currency || "PLN")}
      </p>
    </div>
  );
}

function createEmptyForm(
  legalEntities: LegalEntityOption[] = [],
  defaultRecurring = false,
): ExpenseForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    legalEntityId: legalEntities[0] ? String(legalEntities[0].id) : "",
    locationId: "",
    category: "0",
    paymentStatus: "0",
    vendorName: "",
    vendorNip: "",
    invoiceNumber: "",
    issueDate: today,
    saleDate: today,
    dueDate: "",
    paidAt: "",
    amountMode: "net",
    amount: "",
    vatRate: "23",
    currency: "PLN",
    description: "",
    notes: "",
    isRecurring: defaultRecurring,
    recurrenceEndMode: "count",
    recurrenceEndDate: "",
    recurringOccurrencesCount: "12",
    recurrenceEditScope: "0",
  };
}

function toExpenseForm(expense: CompanyExpense): ExpenseForm {
  return {
    legalEntityId: String(expense.legalEntityId),
    locationId: expense.locationId ? String(expense.locationId) : "",
    category: String(expense.category),
    paymentStatus: String(expense.paymentStatus),
    vendorName: expense.vendorName || "",
    vendorNip: expense.vendorNip || "",
    invoiceNumber: expense.invoiceNumber || "",
    issueDate: toDateValue(expense.issueDate),
    saleDate: toDateValue(expense.saleDate),
    dueDate: toDateValue(expense.dueDate),
    paidAt: toDateValue(expense.paidAt),
    amountMode: "net",
    amount: String(expense.netAmount ?? 0),
    vatRate: inferVatRate(expense.netAmount, expense.vatAmount),
    currency: expense.currency || "PLN",
    description: expense.description || "",
    notes: expense.notes || "",
    isRecurring: expense.isRecurring,
    recurrenceEndMode: expense.recurrenceEndDate ? "date" : "unchanged",
    recurrenceEndDate: toDateValue(expense.recurrenceEndDate),
    recurringOccurrencesCount: "12",
    recurrenceEditScope: "0",
  };
}

function toExpensePayload(
  form: ExpenseForm,
  expense: CompanyExpense | null,
): ExpensePayload | null {
  const legalEntityId = Number(form.legalEntityId);
  const amount = Number(form.amount);
  const vatRate = Number(form.vatRate);
  const occurrencesCount = Number(form.recurringOccurrencesCount);
  const amounts = calculateAmounts(form.amount, form.vatRate, form.amountMode);

  if (
    !Number.isInteger(legalEntityId) ||
    legalEntityId <= 0 ||
    !form.vendorName.trim() ||
    !form.issueDate ||
    Boolean(getNipError(form.vendorNip)) ||
    !form.amount.trim() ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !form.vatRate.trim() ||
    !Number.isFinite(vatRate) ||
    vatRate < 0 ||
    vatRate > 100 ||
    (form.isRecurring &&
      form.recurrenceEndMode === "count" &&
      (!Number.isInteger(occurrencesCount) ||
        occurrencesCount < 2 ||
        occurrencesCount > 120)) ||
    (form.isRecurring &&
      form.recurrenceEndMode === "date" &&
      (!form.recurrenceEndDate || form.recurrenceEndDate < form.issueDate))
  ) {
    return null;
  }

  return {
    legalEntityId,
    locationId: form.locationId ? Number(form.locationId) : null,
    category: Number(form.category),
    paymentStatus: Number(form.paymentStatus),
    vendorName: form.vendorName.trim(),
    vendorNip: nullableText(form.vendorNip),
    invoiceNumber: nullableText(form.invoiceNumber),
    issueDate: form.issueDate,
    saleDate: form.saleDate || null,
    dueDate: form.dueDate || null,
    paidAt: form.paymentStatus === "1" ? form.paidAt || null : null,
    netAmount: amounts.netAmount,
    vatAmount: amounts.vatAmount,
    grossAmount: amounts.grossAmount,
    currency: form.currency.trim().toUpperCase() || "PLN",
    description: nullableText(form.description),
    notes: nullableText(form.notes),
    attachmentUrl: expense?.attachmentUrl || null,
    isRecurring: form.isRecurring,
    recurringGroupId: expense?.recurringGroupId ?? null,
    recurrenceEndDate:
      form.isRecurring && form.recurrenceEndMode === "date"
        ? form.recurrenceEndDate
        : null,
    recurringOccurrencesCount:
      form.isRecurring && form.recurrenceEndMode === "count"
        ? occurrencesCount
        : null,
    ...(expense
      ? {
          recurrenceEditScope: expense.isRecurring
            ? Number(form.recurrenceEditScope)
            : null,
        }
      : {}),
  };
}

function formatRecurrenceDay(issueDate: string) {
  const day = Number(issueDate.slice(8, 10));
  return Number.isFinite(day) && day > 0
    ? `${day}. dnia miesiąca`
    : "w dniu daty wystawienia";
}

function updateForm<K extends keyof ExpenseForm>(
  setter: React.Dispatch<React.SetStateAction<ExpenseForm>>,
  key: K,
  value: ExpenseForm[K],
) {
  setter((current) => ({ ...current, [key]: value }));
}

function nullableText(value: string) {
  return value.trim() || null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateAmounts(
  amountValue: string,
  vatRateValue: string,
  mode: ExpenseForm["amountMode"],
) {
  const amount = Math.max(0, Number(amountValue) || 0);
  const vatRate = Math.max(0, Number(vatRateValue) || 0);

  if (mode === "gross") {
    const grossAmount = roundMoney(amount);
    const netAmount = roundMoney(grossAmount / (1 + vatRate / 100));
    return {
      netAmount,
      vatAmount: roundMoney(grossAmount - netAmount),
      grossAmount,
    };
  }

  const netAmount = roundMoney(amount);
  const vatAmount = roundMoney(netAmount * (vatRate / 100));
  return {
    netAmount,
    vatAmount,
    grossAmount: roundMoney(netAmount + vatAmount),
  };
}

function changeAmountMode(
  setter: React.Dispatch<React.SetStateAction<ExpenseForm>>,
  mode: ExpenseForm["amountMode"],
) {
  setter((current) => {
    if (current.amountMode === mode) return current;
    const amounts = calculateAmounts(
      current.amount,
      current.vatRate,
      current.amountMode,
    );

    return {
      ...current,
      amountMode: mode,
      amount: current.amount
        ? String(mode === "net" ? amounts.netAmount : amounts.grossAmount)
        : "",
    };
  });
}

function inferVatRate(netAmount: number, vatAmount: number) {
  if (!netAmount || !vatAmount) return vatAmount ? "23" : "0";
  return String(roundMoney((vatAmount / netAmount) * 100));
}

function formatVatRate(value: string) {
  const rate = Number(value);
  return Number.isFinite(rate) ? rate : 0;
}

function getNipError(value: string) {
  if (!value) return null;
  if (!/^\d{10}$/.test(value)) return "NIP musi mieć dokładnie 10 cyfr.";

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const checksum = weights.reduce(
    (sum, weight, index) => sum + Number(value[index]) * weight,
    0,
  ) % 11;

  if (checksum === 10 || checksum !== Number(value[9])) {
    return "Nieprawidłowa suma kontrolna NIP.";
  }

  return null;
}

function isLocationValidForEntity(
  locationId: string,
  legalEntityId: string,
  locations: Location[],
) {
  if (!locationId) return true;
  const location = locations.find((item) => String(item.id) === locationId);
  return (
    !location?.legalEntityId || String(location.legalEntityId) === legalEntityId
  );
}
