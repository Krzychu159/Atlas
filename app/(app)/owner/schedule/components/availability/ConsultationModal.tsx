"use client";

import { useState } from "react";
import { CalendarPlus, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { compactFieldLabelClassName } from "@/app/components/ui/field-density";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { TimeField } from "@/app/components/availability/TimeField";
import { getErrorMessage } from "@/app/lib/backend";
import { createAvailabilityConsultation, getConsultationWarning, type AvailabilityScheduleTrainer, type AvailabilitySlot } from "@/app/lib/availability";
import { formatIsoDate, formatTime, fromMinutes, toMinutes, validateRanges } from "@/app/lib/availability-time";
import { getOutlookColor } from "@/app/lib/calendar/outlook-colors";
import type { Location } from "@/app/lib/owner/locations";

/** A UTC instant for a studio time on the slot's day, counted from the slot's own start (no time zone math here). */
function instantFor(slot: AvailabilitySlot, time: string) {
  const offset = (toMinutes(time) ?? 0) - (toMinutes(slot.start) ?? 0);
  return new Date(Date.parse(slot.startAt) + offset * 60_000).toISOString();
}

export function ConsultationModal({
  trainer,
  date,
  slot,
  locations,
  onClose,
  onCreated,
}: {
  trainer: AvailabilityScheduleTrainer;
  date: string;
  slot: AvailabilitySlot;
  locations: Location[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const options = locations
    .filter((location) => trainer.locationIds.includes(location.id))
    .map((location) => ({ value: String(location.id), label: location.name ?? "Lokalizacja" }));
  const slotStart = toMinutes(slot.start) ?? 0;
  const slotEnd = toMinutes(slot.end) ?? slotStart + 60;
  const [locationId, setLocationId] = useState(options.length === 1 ? options[0].value : "");
  const [start, setStart] = useState(slot.start);
  const [end, setEnd] = useState(fromMinutes(Math.min(slotStart + 60, slotEnd)));
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const timeError = validateRanges([{ start, end }])[0];
  const color = getOutlookColor(trainer.outlookCategoryColor);

  async function save(confirmOutsideAvailability: boolean) {
    if (!locationId) return setError("Wybierz lokalizację konsultacji.");
    if (timeError) return setError(timeError);
    setSaving(true);
    setError(null);
    try {
      await createAvailabilityConsultation({
        trainerId: trainer.trainerId,
        locationId: Number(locationId),
        startAt: instantFor(slot, start),
        endAt: instantFor(slot, end),
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        confirmOutsideAvailability,
      });
      onCreated();
    } catch (err) {
      const outside = getConsultationWarning(err);
      if (outside && !confirmOutsideAvailability) setWarning(outside.message);
      else setError(getErrorMessage(err, "Nie udało się dodać konsultacji. Spróbuj ponownie."));
    } finally {
      setSaving(false);
    }
  }

  const changeTime = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setWarning(null);
    setError(null);
  };

  return (
    <ModalOverlay onClose={saving ? undefined : onClose} closeDisabled={saving}>
      <div role="dialog" aria-modal="true" aria-label="Dodaj konsultację"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="space-y-4 p-5 md:p-6">
          <ModalHeader
            eyebrow={`${trainer.name} · ${formatIsoDate(date)}`}
            title="Dodaj konsultację"
            description={`Dyspozycja: ${formatTime(slot.start)}–${formatTime(slot.end)}. Konsultacja trafi do grafiku i kalendarza trenera.`}
            icon={<CalendarPlus size={20} />}
            onClose={onClose}
          />
          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-3 py-2 text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: color.bg }} />
            <span className="font-semibold text-on-surface">{trainer.name}</span>
          </div>
          {options.length > 1 ? (
            <CustomSelect label="Lokalizacja" value={locationId} onChange={(value) => { setLocationId(value); setError(null); }}
              options={[{ value: "", label: "Wybierz lokalizację", disabled: true }, ...options]} />
          ) : options.length === 1 ? (
            <p className="text-sm text-on-surface-variant">Lokalizacja: <span className="font-semibold text-on-surface">{options[0].label}</span></p>
          ) : (
            <p role="alert" className="text-sm text-error-light">Trener nie ma przypisanej żadnej aktywnej lokalizacji.</p>
          )}
          <div role="group" aria-labelledby="consultation-hours">
            <span id="consultation-hours" className={compactFieldLabelClassName}>Godziny</span>
            <div className="mt-1.5 flex items-center gap-2">
              <TimeField label="Początek konsultacji" value={start} invalid={Boolean(timeError)} onChange={changeTime(setStart)} />
              <span aria-hidden="true" className="text-on-surface-muted">–</span>
              <TimeField label="Koniec konsultacji" value={end} invalid={Boolean(timeError)} onChange={changeTime(setEnd)} />
            </div>
          </div>
          <TextField label="Tytuł (opcjonalnie)" value={title} onChange={setTitle} placeholder="Konsultacja" maxLength={200} />
          <TextArea label="Notatka (opcjonalnie)" value={note} onChange={setNote} rows={2} maxLength={1000} />

          {warning ? (
            <div role="alert" className="flex gap-3 rounded-[var(--radius-lg)] bg-warning-container/40 p-3 text-sm leading-6 text-warning-light">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>{warning}</p>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-error-light">{error}</p> : null}
        </div>
        <ModalFooter>
          <Button type="button" variant="secondary" disabled={saving} onClick={warning ? () => setWarning(null) : onClose}>
            {warning ? "Zmień termin" : "Anuluj"}
          </Button>
          <Button type="button" disabled={saving || !options.length} icon={saving ? <Loader2 size={16} className="animate-spin" /> : undefined}
            onClick={() => void save(Boolean(warning))}>
            {saving ? "Dodaję…" : warning ? "Dodaj mimo to" : "Dodaj konsultację"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
