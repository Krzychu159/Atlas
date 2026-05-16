"use client";

import { useState, type ReactNode } from "react";
import { MapPin, Plus, Save, Search, UserRound, WalletCards, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import type { Client } from "@/app/lib/owner/clients";
import type { Location } from "@/app/lib/owner/locations";
import type { OwnerSession } from "@/app/lib/owner/sessions";
import type { Trainer } from "@/app/lib/owner/trainers";
import {
  getClientDisplayName,
  getSuggestedSessionTitle,
  isActiveClientForSession,
  matchesClientSearch,
  normalizeSearch,
} from "../client-utils";
import { statusOptions, sessionTypeOptions } from "../options";
import {
  getDefaultFormValues,
  getSessionPackageName,
  getSessionStatusLabel,
  getSessionTitle,
} from "../session-utils";
import type { SessionFormValues } from "../types";
import SessionMetaChip from "./SessionMetaChip";

export default function SessionEditorModal({
  open,
  session,
  anchorDate,
  trainers,
  locations,
  clients,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  session: OwnerSession | null;
  anchorDate: Date;
  trainers: Trainer[];
  locations: Location[];
  clients: Client[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: SessionFormValues) => void;
}) {
  const [values, setValues] = useState<SessionFormValues>(() =>
    getDefaultFormValues({ session, date: anchorDate, trainers, locations }),
  );
  const [clientSearch, setClientSearch] = useState("");
  const [isTitleEdited, setIsTitleEdited] = useState(() =>
    Boolean(session?.title),
  );

  if (!open) return null;

  const trainerOptions = trainers.map((trainer) => ({
    value: String(trainer.id),
    label: trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
  }));
  const locationOptions = locations.map((location) => ({
    value: String(location.id),
    label: location.name || location.city || `Lokalizacja ${location.id}`,
  }));
  const selectedClientIds = new Set(values.participantIds);
  const selectedTrainerId = Number(values.trainerId);
  const clientQuery = normalizeSearch(clientSearch);
  const activeClients = clients.filter(
    (client) =>
      selectedClientIds.has(String(client.id)) ||
      isActiveClientForSession(client),
  );
  const orderedClients = [...activeClients].sort((first, second) => {
    const firstSelected = selectedClientIds.has(String(first.id));
    const secondSelected = selectedClientIds.has(String(second.id));

    if (firstSelected !== secondSelected) return firstSelected ? -1 : 1;

    const firstSameTrainer = first.trainerId === selectedTrainerId;
    const secondSameTrainer = second.trainerId === selectedTrainerId;

    if (firstSameTrainer !== secondSameTrainer) {
      return firstSameTrainer ? -1 : 1;
    }

    return getClientDisplayName(first).localeCompare(
      getClientDisplayName(second),
      "pl",
    );
  });
  const visibleClients = orderedClients.filter(
    (client) =>
      selectedClientIds.has(String(client.id)) ||
      matchesClientSearch(client, clientQuery),
  );

  function updateValue(
    key: Exclude<keyof SessionFormValues, "participantIds">,
    value: string,
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(value: string) {
    setIsTitleEdited(true);
    updateValue("title", value);
  }

  function toggleParticipant(clientId: string) {
    setValues((current) => {
      const participantIds = current.participantIds.includes(clientId)
        ? current.participantIds.filter((id) => id !== clientId)
        : [...current.participantIds, clientId];
      const suggestedTitle = getSuggestedSessionTitle(participantIds, clients);

      return {
        ...current,
        participantIds,
        title: !session && !isTitleEdited ? suggestedTitle : current.title,
      };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        aria-label="Zamknij"
        className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
        onClick={onClose}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
        className="relative z-10 max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 shadow-ambient md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">
              {session ? "Szczegóły sesji" : "Nowa sesja"}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              {session ? getSessionTitle(session) : "Dodaj sesję do grafiku"}
            </h2>
            {session ? (
              <p className="mt-2 text-sm text-on-surface-variant">
                ID #{session.id} · {getSessionStatusLabel(session.status)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition hover:text-on-surface"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {session ? (
          <div className="mt-5 grid gap-2 md:grid-cols-3">
            <SessionMetaChip
              icon={<UserRound size={14} />}
              label="Trener"
              value={session.trainerFullName || "Brak"}
              tone="primary"
            />
            <SessionMetaChip
              icon={<MapPin size={14} />}
              label="Lokalizacja"
              value={session.locationName || "Brak"}
              tone="neutral"
            />
            <SessionMetaChip
              icon={<WalletCards size={14} />}
              label="Pakiet"
              value={getSessionPackageName(session)}
              tone="success"
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Tytuł" className="md:col-span-2">
            <input
              value={values.title}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder={
                values.participantIds.length
                  ? getSuggestedSessionTitle(values.participantIds, clients)
                  : "Np. Anna N + Dominik S"
              }
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Start">
            <input
              type="datetime-local"
              value={values.startAt}
              onChange={(event) => updateValue("startAt", event.target.value)}
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Koniec">
            <input
              type="datetime-local"
              value={values.endAt}
              onChange={(event) => updateValue("endAt", event.target.value)}
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Trener">
            <CustomSelect
              value={values.trainerId}
              options={
                trainerOptions.length
                  ? trainerOptions
                  : [{ value: "", label: "Brak trenerów" }]
              }
              onChange={(value) => updateValue("trainerId", value)}
            />
          </Field>

          <Field label="Lokalizacja">
            <CustomSelect
              value={values.locationId}
              options={
                locationOptions.length
                  ? locationOptions
                  : [{ value: "", label: "Brak lokalizacji" }]
              }
              onChange={(value) => updateValue("locationId", value)}
            />
          </Field>

          <Field label="Klienci sesji" className="md:col-span-2">
            <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] bg-surface-container px-3">
                  <Search size={16} className="shrink-0 text-primary-light" />
                  <input
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    placeholder="Szukaj klienta..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-muted"
                  />
                </div>
                <span className="shrink-0 rounded-full bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface-variant">
                  {values.participantIds.length}/{activeClients.length}
                </span>
              </div>

              {activeClients.length ? (
                visibleClients.length ? (
                  <div className="mt-2 grid max-h-[260px] gap-2 overflow-y-auto md:grid-cols-2">
                    {visibleClients.map((client) => {
                      const clientId = String(client.id);
                      const selected = selectedClientIds.has(clientId);

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => toggleParticipant(clientId)}
                          className={[
                            "flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition",
                            selected
                              ? "border-primary/60 bg-primary/10 text-on-surface"
                              : "border-transparent bg-surface-container text-on-surface-variant hover:border-white/10 hover:text-on-surface",
                          ].join(" ")}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {getClientDisplayName(client)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-on-surface-muted">
                              {client.email ||
                                client.phoneNumber ||
                                "Brak kontaktu"}
                            </span>
                          </span>
                          <span
                            className={[
                              "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                              selected
                                ? "bg-primary text-on-primary"
                                : "bg-surface-container-low text-on-surface-muted",
                            ].join(" ")}
                          >
                            {selected ? "Wybrany" : "Dodaj"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-2 rounded-[var(--radius-md)] bg-surface-container px-4 py-3 text-sm text-on-surface-muted">
                    Brak wyników.
                  </div>
                )
              ) : (
                <div className="mt-2 rounded-[var(--radius-md)] bg-surface-container px-4 py-3 text-sm text-on-surface-muted">
                  Brak aktywnych klientów do przypisania.
                </div>
              )}
            </div>
          </Field>

          <Field label="Status">
            <CustomSelect
              value={values.status}
              options={statusOptions}
              onChange={(value) => updateValue("status", value)}
            />
          </Field>

          <Field label="Typ sesji">
            <CustomSelect
              value={values.plannedSessionType}
              options={sessionTypeOptions}
              onChange={(value) => updateValue("plannedSessionType", value)}
            />
          </Field>

          <Field label="Kategorie Outlook" className="md:col-span-2">
            <input
              value={values.outlookCategories}
              onChange={(event) =>
                updateValue("outlookCategories", event.target.value)
              }
              placeholder="Np. Personal, Paid"
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Notatka" className="md:col-span-2">
            <textarea
              value={values.note}
              onChange={(event) => updateValue("note", event.target.value)}
              rows={4}
              className="w-full resize-none rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3 text-sm outline-none"
            />
          </Field>
        </div>

        {session?.participants?.length ? (
          <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <p className="text-label text-on-surface-muted">Uczestnicy</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {session.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-[var(--radius-md)] bg-surface-container px-3 py-2"
                >
                  <p className="text-sm font-semibold text-on-surface">
                    {participant.clientFullName ||
                      `Klient #${participant.clientId}`}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-muted">
                    {participant.packageName || "Brak pakietu"} ·{" "}
                    {participant.sessionsCharged} ses.
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
          <Button
            type="submit"
            icon={session ? <Save size={16} /> : <Plus size={16} />}
            disabled={isSaving}
          >
            {isSaving
              ? "Zapisywanie..."
              : session
                ? "Zapisz zmiany"
                : "Dodaj sesję"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-label text-on-surface-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
