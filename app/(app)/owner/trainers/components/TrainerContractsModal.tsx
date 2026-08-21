"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { TextArea, TextField } from "@/app/components/ui/input";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";
import {
  createTrainerContract,
  deleteTrainerContract,
  getTrainerContract,
  getTrainerContracts,
  updateTrainerContract,
  type TrainerContract,
  type TrainerContractType,
} from "@/app/lib/owner/contracts";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../../components/owner-toast";

type TrainerContractsModalProps = {
  open: boolean;
  trainerId: number;
  trainerName: string;
  onClose: () => void;
};

type ContractForm = {
  contractType: TrainerContractType | "";
  contractNumber: string;
  signedAt: string;
  validFrom: string;
  validTo: string;
  notes: string;
  isActive: boolean;
};

function getToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function emptyForm(): ContractForm {
  const today = getToday();

  return {
    contractType: "",
    contractNumber: "",
    signedAt: today,
    validFrom: today,
    validTo: "",
    notes: "",
    isActive: true,
  };
}

function contractToForm(contract: TrainerContract): ContractForm {
  return {
    contractType: normalizeContractType(contract.contractType),
    contractNumber: contract.contractNumber || "",
    signedAt: contract.signedAt.slice(0, 10),
    validFrom: contract.validFrom.slice(0, 10),
    validTo: contract.validTo?.slice(0, 10) || "",
    notes: contract.notes || "",
    isActive: contract.isActive,
  };
}

const contractTypeOptions = [
  { value: "", label: "Wybierz typ umowy" },
  { value: "Zlecenie", label: "Umowa Zlecenie" },
  { value: "B2B", label: "Umowa B2B" },
];

function normalizeContractType(value: string | null): ContractForm["contractType"] {
  const normalized = (value || "").toLowerCase();

  if (normalized.includes("b2b")) return "B2B";
  if (normalized.includes("zlecen")) return "Zlecenie";

  return "";
}

function formatContractType(value: string | null) {
  const normalized = normalizeContractType(value);

  if (normalized === "B2B") return "Umowa B2B";
  if (normalized === "Zlecenie") return "Umowa Zlecenie";

  return "Umowa bez typu";
}

function toApiDate(value: string) {
  return `${value}T00:00:00`;
}

function formatDate(value: string | null) {
  if (!value) return "bezterminowo";

  return new Date(value).toLocaleDateString("pl-PL");
}

export default function TrainerContractsModal({
  open,
  trainerId,
  trainerName,
  onClose,
}: TrainerContractsModalProps) {
  const [contracts, setContracts] = useState<TrainerContract[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contractToDelete, setContractToDelete] =
    useState<TrainerContract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedId) ?? null,
    [contracts, selectedId],
  );

  useEffect(() => {
    if (!open) return;

    async function loadContracts() {
      try {
        setIsLoading(true);
        const data = await getTrainerContracts(trainerId);
        const preferred =
          data.find((contract) => contract.isCurrent) ?? data[0] ?? null;

        setContracts(data);
        setSelectedId(preferred?.id ?? null);
        setForm(preferred ? contractToForm(preferred) : emptyForm());
        setIsCreating(!preferred);
      } catch (error) {
        showOwnerError(error, "Nie udało się pobrać umów trenera.", {
          id: "owner-trainer-contracts-load-error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadContracts();
  }, [open, trainerId]);

  if (!open) return null;

  async function selectContract(contractId: number) {
    try {
      setIsLoading(true);
      const contract = await getTrainerContract(trainerId, contractId);

      setContracts((current) =>
        current.map((item) => (item.id === contract.id ? contract : item)),
      );
      setSelectedId(contract.id);
      setForm(contractToForm(contract));
      setIsCreating(false);
    } catch (error) {
      showOwnerError(error, "Nie udało się pobrać szczegółów umowy.", {
        id: "owner-trainer-contract-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function startCreating() {
    setSelectedId(null);
    setForm(emptyForm());
    setIsCreating(true);
  }

  function updateForm<Key extends keyof ContractForm>(
    key: Key,
    value: ContractForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.signedAt || !form.validFrom) {
      showOwnerError(
        new Error("Uzupełnij datę podpisania i początek obowiązywania."),
        "Uzupełnij wymagane daty.",
        { id: "owner-trainer-contract-dates-required" },
      );
      return;
    }

    if (!form.contractType) {
      showOwnerError(new Error("Wybierz typ umowy."), "", {
        id: "owner-trainer-contract-type-required",
      });
      return;
    }

    const payload = {
      contractType: form.contractType,
      contractNumber: form.contractNumber.trim() || null,
      signedAt: toApiDate(form.signedAt),
      validFrom: toApiDate(form.validFrom),
      validTo: form.validTo ? toApiDate(form.validTo) : null,
      notes: form.notes.trim() || null,
    };

    try {
      setIsSaving(true);
      const saved = isCreating
        ? await createTrainerContract(trainerId, payload)
        : await updateTrainerContract(trainerId, selectedId as number, {
            ...payload,
            isActive: form.isActive,
          });
      const refreshed = await getTrainerContracts(trainerId);
      const refreshedSaved =
        refreshed.find((contract) => contract.id === saved.id) ?? saved;

      setContracts(refreshed);
      setSelectedId(saved.id);
      setForm(contractToForm(refreshedSaved));
      setIsCreating(false);
      showOwnerSuccess(
        isCreating
          ? "Dodano nową umowę trenera."
          : "Zaktualizowano umowę trenera.",
        { id: "owner-trainer-contract-save-success" },
      );
    } catch (error) {
      showOwnerError(error, "Nie udało się zapisać umowy trenera.", {
        id: "owner-trainer-contract-save-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteContract() {
    if (!contractToDelete) return;

    try {
      setIsDeleting(true);
      await deleteTrainerContract(trainerId, contractToDelete.id);

      const remaining = contracts.filter(
        (contract) => contract.id !== contractToDelete.id,
      );
      const preferred =
        remaining.find((contract) => contract.isCurrent) ??
        remaining[0] ??
        null;

      setContracts(remaining);
      setSelectedId(preferred?.id ?? null);
      setForm(preferred ? contractToForm(preferred) : emptyForm());
      setIsCreating(!preferred);
      setContractToDelete(null);
      showOwnerSuccess("Umowa trenera została usunięta.", {
        id: "owner-trainer-contract-delete-success",
      });
    } catch (error) {
      showOwnerError(error, "Nie udało się usunąć umowy trenera.", {
        id: "owner-trainer-contract-delete-error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
    <ModalOverlay onClose={onClose} className="px-3 py-3 md:px-4 md:py-6">
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[980px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient md:max-h-[calc(100dvh-3rem)]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader
            eyebrow="Dokumenty kadrowe"
            title="Umowy trenera"
            description={`Aktualna umowa i historia dokumentów dla: ${trainerName}.`}
            icon={<FileSignature size={21} />}
            onClose={onClose}
          />

          <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <section className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label text-on-surface-muted">Umowy</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={15} />}
                  onClick={startCreating}
                  disabled={isSaving}
                >
                  Dodaj nową
                </Button>
              </div>

              <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2 lg:max-h-[520px] lg:snap-none lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1">
                {isLoading && contracts.length === 0 ? (
                  <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-sm text-on-surface-variant">
                    Ładowanie umów...
                  </div>
                ) : contracts.length > 0 ? (
                  contracts.map((contract) => (
                    <button
                      key={contract.id}
                      type="button"
                      onClick={() => void selectContract(contract.id)}
                      className={[
                        "min-w-[min(78vw,280px)] snap-start rounded-[var(--radius-lg)] p-4 text-left transition lg:min-w-0",
                        selectedId === contract.id && !isCreating
                          ? "bg-primary/15 outline outline-1 outline-primary-light/30"
                          : "bg-surface-container-low hover:bg-surface-container-high",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface">
                            {formatContractType(contract.contractType)}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-muted">
                            {contract.contractNumber || "Bez numeru"}
                          </p>
                        </div>
                        {contract.isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-container px-2 py-1 text-[0.68rem] font-semibold text-tertiary-light">
                            <CheckCircle2 size={12} /> Aktualna
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
                        <CalendarDays size={14} className="text-primary-light" />
                        {formatDate(contract.validFrom)} –{" "}
                        {formatDate(contract.validTo)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-sm text-on-surface-variant">
                    Ten trener nie ma jeszcze żadnej umowy.
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-label text-primary-light">
                    {isCreating ? "Nowa umowa" : "Edycja umowy"}
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {isCreating
                      ? "Uzupełnij dane nowego dokumentu."
                      : "Zmień dane wybranej umowy i zapisz."}
                  </p>
                </div>
                {!isCreating && selectedContract ? (
                  <Pencil size={19} className="text-primary-light" />
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-label text-on-surface-muted">
                    Typ umowy
                  </span>
                  <CustomSelect
                    value={form.contractType}
                    options={contractTypeOptions}
                    onChange={(value) =>
                      updateForm("contractType", value as TrainerContractType)
                    }
                    className="mt-2"
                  />
                </div>
                <TextField
                  label="Numer umowy"
                  value={form.contractNumber}
                  onChange={(value) => updateForm("contractNumber", value)}
                  placeholder="np. UZ/08/2026"
                />
                <TextField
                  label="Data podpisania"
                  value={form.signedAt}
                  onChange={(value) => updateForm("signedAt", value)}
                  type="date"
                  required
                />
                <TextField
                  label="Obowiązuje od"
                  value={form.validFrom}
                  onChange={(value) => updateForm("validFrom", value)}
                  type="date"
                  required
                />
                <TextField
                  label="Obowiązuje do"
                  value={form.validTo}
                  onChange={(value) => updateForm("validTo", value)}
                  type="date"
                  min={form.validFrom}
                />
                {!isCreating ? (
                  <label className="flex min-h-12 items-center gap-3 self-end rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        updateForm("isActive", event.target.checked)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    Umowa aktywna
                  </label>
                ) : null}
                <TextArea
                  label="Notatki"
                  value={form.notes}
                  onChange={(value) => updateForm("notes", value)}
                  placeholder="Opcjonalne informacje do umowy"
                  className="md:col-span-2"
                  rows={3}
                />
              </div>
            </section>
          </div>
        </div>

        <ModalFooter>
          {!isCreating && selectedContract ? (
            <Button
              type="button"
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={() => setContractToDelete(selectedContract)}
              disabled={isSaving || isDeleting}
              className="w-full sm:mr-auto sm:w-auto"
            >
              Usuń umowę
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="w-full sm:w-auto"
          >
            Zamknij
          </Button>
          <Button
            type="submit"
            icon={<Save size={16} />}
            disabled={
              isSaving ||
              isDeleting ||
              !form.contractType ||
              (!isCreating && !selectedId)
            }
            className="w-full sm:w-auto"
          >
            {isSaving
              ? "Zapisywanie..."
              : isCreating
                ? "Dodaj umowę"
                : "Zapisz zmiany"}
          </Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
    {contractToDelete ? (
      <DeleteContractConfirmModal
        contract={contractToDelete}
        isDeleting={isDeleting}
        onClose={() => setContractToDelete(null)}
        onConfirm={() => void handleDeleteContract()}
      />
    ) : null}
    </>
  );
}

function DeleteContractConfirmModal({
  contract,
  isDeleting,
  onClose,
  onConfirm,
}: {
  contract: TrainerContract;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]">
      <button
        type="button"
        aria-label="Anuluj usuwanie umowy"
        onClick={onClose}
        disabled={isDeleting}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-contract-title"
        className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient"
      >
        <ModalHeader
          title="Usunąć umowę?"
          description="Tej operacji nie można cofnąć. Umowa zostanie trwale usunięta z historii trenera."
          icon={<AlertTriangle size={19} />}
          iconTone="danger"
          onClose={onClose}
          className="p-5 md:p-6"
        />

        <div className="mx-5 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 md:mx-6">
          <p id="delete-contract-title" className="font-semibold text-on-surface">
            {formatContractType(contract.contractType)}
          </p>
          <p className="mt-1 break-words text-sm text-on-surface-variant">
            {contract.contractNumber || "Bez numeru"}
          </p>
        </div>

        <ModalFooter className="mt-5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting ? "Usuwanie..." : "Usuń umowę"}
          </Button>
        </ModalFooter>
      </div>
    </div>
  );
}
