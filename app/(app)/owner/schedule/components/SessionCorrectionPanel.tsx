"use client";

import { X } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { compactFieldLabelClassName } from "@/app/components/ui/field-density";
import { attendanceLabel } from "@/app/lib/group-sessions";
import {
  attendanceCorrectionOptions,
  chargesPackageEntry,
  getParticipantCorrection,
} from "../session-utils";
import type { CorrectionMode, ParticipantCorrection, SessionEditorSession, SessionFormValues } from "../types";

const modes: { value: CorrectionMode; label: string; hint: string }[] = [
  { value: "participants", label: "Uczestnicy i obecność", hint: "Zmień listę uczestników, obecność, wejścia lub typ rozliczenia. Wejścia i saldo klientów zostaną przeliczone." },
  { value: "details", label: "Termin, trener, lokalizacja", hint: "Popraw dane sesji bez przeliczania wejść i sald klientów." },
  { value: "not-held", label: "Sesja się nie odbyła", hint: "Sesja przestanie być zrealizowana, a pobrane wejścia wrócą do pakietów klientów." },
];

export function SessionCorrectionPanel({
  mode,
  values,
  allowParticipants,
  billingType,
  billingTypeOptions,
  disabled,
  onModeChange,
  onStatusChange,
  onReasonChange,
  onBillingTypeChange,
}: {
  mode: CorrectionMode;
  values: SessionFormValues;
  allowParticipants: boolean;
  billingType: string;
  billingTypeOptions: { value: string; label: string }[];
  disabled: boolean;
  onModeChange: (mode: CorrectionMode) => void;
  onStatusChange: (status: "Cancelled" | "Planned") => void;
  onReasonChange: (value: string) => void;
  onBillingTypeChange: ((value: string) => void) | null;
}) {
  const options = allowParticipants ? modes : modes.filter(option => option.value !== "participants");
  const hint = modes.find(option => option.value === mode)?.hint;
  return (
    <fieldset disabled={disabled} className="mt-4 min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <legend className="float-left w-full font-semibold text-on-surface">Korekta zrealizowanej sesji</legend>

      <p className="clear-left pt-1 text-xs text-on-surface-variant">Wejścia, pakiety i saldo klientów zmieniają się tylko przez korektę w ATLAS. Zmiany w Outlooku ich nie ruszają.</p>

      <div role="radiogroup" aria-label="Co chcesz poprawić?" className={`mt-3 grid gap-2 ${options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {options.map(option => (
          <label key={option.value} className={[
            "flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-center text-sm font-semibold leading-tight transition focus-within:outline-2 focus-within:outline-primary-light",
            mode === option.value ? "border-primary/60 bg-primary/10 text-on-surface" : "border-transparent bg-surface-container text-on-surface-variant hover:text-on-surface",
          ].join(" ")}>
            <input type="radio" name="session-correction-mode" value={option.value} checked={mode === option.value} onChange={() => onModeChange(option.value)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
      {hint ? <p className="mt-2 text-xs text-on-surface-muted">{hint}</p> : null}

      {mode === "not-held" ? (
        <div role="radiogroup" aria-label="Co dalej z sesją?" className="mt-3 grid gap-2 sm:grid-cols-2">
          {([["Cancelled", "Anuluj sesję", "Nie odbyła się i nie zostanie odrobiona."], ["Planned", "Przywróć do zaplanowanych", "Odbędzie się w innym terminie."]] as const).map(([status, label, description]) => (
            <label key={status} className={[
              "flex cursor-pointer flex-col rounded-[var(--radius-md)] border px-3 py-2 text-sm transition focus-within:outline-2 focus-within:outline-primary-light",
              values.status === status ? "border-primary/60 bg-primary/10 text-on-surface" : "border-transparent bg-surface-container text-on-surface-variant hover:text-on-surface",
            ].join(" ")}>
              <input type="radio" name="session-correction-status" value={status} checked={values.status === status} onChange={() => onStatusChange(status)} className="sr-only" />
              <span className="font-semibold">{label}</span>
              <span className="mt-0.5 text-xs text-on-surface-muted">{description}</span>
            </label>
          ))}
        </div>
      ) : null}

      {mode === "participants" && onBillingTypeChange ? (
        <label className="mt-3 block">
          <span className={`mb-1.5 block ${compactFieldLabelClassName}`}>Typ rozliczenia</span>
          <CustomSelect value={billingType} options={billingTypeOptions} onChange={onBillingTypeChange} />
        </label>
      ) : null}

      <label className="mt-3 block">
        <span className={`mb-1.5 block ${compactFieldLabelClassName}`}>Powód korekty</span>
        <textarea required maxLength={500} value={values.correctionReason || ""} rows={2}
          onChange={event => onReasonChange(event.target.value)}
          placeholder="Np. klient nie przyszedł, sesja odwołana przez trenera"
          className="w-full resize-none rounded-[var(--radius-lg)] bg-surface-container px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <span className="mt-1 block text-xs text-on-surface-muted">Powód zobaczysz w historii sesji.</span>
      </label>
    </fieldset>
  );
}

export function CorrectionParticipantRows({
  session,
  values,
  disabled,
  nameFor,
  onChange,
  onRemove,
}: {
  session: SessionEditorSession;
  values: SessionFormValues;
  disabled: boolean;
  nameFor: (clientId: string) => string;
  onChange: (clientId: string, correction: ParticipantCorrection) => void;
  onRemove: (clientId: string) => void;
}) {
  const removed = (session.participants ?? []).filter(participant => !values.participantIds.includes(String(participant.clientId)));
  return (
    <div className="space-y-2">
      <p className="text-xs text-on-surface-variant">Wejście z pakietu jest pobierane tylko od obecnego uczestnika rozliczanego z pakietu. Usunięcie z listy zwraca klientowi wejście.</p>
      {values.participantIds.length === 0 ? <p className="rounded-[var(--radius-md)] bg-surface-container px-3 py-2 text-sm text-on-surface-muted">Brak uczestników. Po zapisaniu wszystkim zostaną zwrócone wejścia.</p> : null}
      {values.participantIds.map(clientId => {
        const correction = getParticipantCorrection(clientId, session, values);
        const options = attendanceCorrectionOptions.some(option => option.value === correction.attendanceStatus)
          ? attendanceCorrectionOptions
          : [{ value: correction.attendanceStatus, label: attendanceLabel(correction.attendanceStatus) }, ...attendanceCorrectionOptions];
        const charged = chargesPackageEntry(correction);
        const isNew = !session.participants?.some(participant => String(participant.clientId) === clientId);
        return (
          <fieldset key={clientId} disabled={disabled} className="min-w-0 rounded-[var(--radius-md)] bg-surface-container p-3">
            <legend className="sr-only">{nameFor(clientId)}</legend>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">{nameFor(clientId)}</p>
                <p className={`mt-0.5 text-xs ${charged ? "text-primary-light" : "text-on-surface-muted"}`}>
                  {isNew ? "Nowy uczestnik · " : ""}{charged ? `Wejścia z pakietu: ${correction.sessionsCharged || 0}` : "Bez wejścia z pakietu"}
                </p>
              </div>
              <button type="button" onClick={() => onRemove(clientId)} aria-label={`Usuń ${nameFor(clientId)} z sesji`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-muted transition hover:text-on-surface">
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_7rem] sm:items-end">
              <label className="min-w-0">
                <span className={`mb-1.5 block ${compactFieldLabelClassName}`}>Obecność</span>
                <CustomSelect value={correction.attendanceStatus} options={options} onChange={value => onChange(clientId, { ...correction, attendanceStatus: value })} />
              </label>
              <label className="flex h-10 items-center gap-2 text-sm text-on-surface">
                <input type="checkbox" checked={correction.countsAgainstPackage} onChange={event => onChange(clientId, { ...correction, countsAgainstPackage: event.target.checked })} className="h-5 w-5 accent-primary" />
                Z pakietu
              </label>
              <label>
                <span className={`mb-1.5 block ${compactFieldLabelClassName}`}>Wejścia</span>
                <input type="number" min="0" max="100" step="1" required value={correction.sessionsCharged}
                  onChange={event => onChange(clientId, { ...correction, sessionsCharged: event.target.value })}
                  className="h-10 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </label>
            </div>
          </fieldset>
        );
      })}
      {removed.length ? (
        <p className="text-xs text-warning-light">
          Zostaną usunięci z sesji, a pobrane wejścia wrócą do ich pakietów: {removed.map(participant => participant.clientFullName || nameFor(String(participant.clientId))).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
