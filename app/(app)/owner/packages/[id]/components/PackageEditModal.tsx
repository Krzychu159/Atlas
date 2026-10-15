"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import {
  updatePackage,
  getPackage,
  type Package,
} from "@/app/lib/owner/packages";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../../../components/owner-toast";

import { CustomSelect } from "@/app/components/ui/custom-select";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { createPackageForm, changePackageField, packageFormPayload, type PackageForm } from "../../package-form";
import PackagePublicationFields from "../../components/PackagePublicationFields";
import { isPeriodPackage, packageBillingModeOptions, periodPackageError } from "@/app/lib/period-packages";
import { ApiError } from "@/app/lib/backend";

export default function PackageEditModal({
  item,
  onClose,
  onUpdated,
}: {
  item: Package;
  onClose: () => void;
  onUpdated: (item: Package) => void;
}) {
  const [form, setForm] = useState(() => createPackageForm(item));
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const periodBased = form.billingMode === "PeriodBased";

  useEffect(() => {
    let active = true;
    getLocations().then((result) => { if (active) setLocations(result); })
      .catch((error) => { if (active) showOwnerError(error, "Nie udało się pobrać lokalizacji."); });
    return () => { active = false; };
  }, []);

  function updateField<K extends keyof PackageForm>(field: K, value: PackageForm[K]) {
    setForm((current) => changePackageField(current, field, value));
  }

  const locationOptions = [
    { value: "", label: "Bez przypisania" },
    ...locations.map((location) => ({ value: String(location.id), label: location.name || location.city || `Lokalizacja ${location.id}` })),
  ];
  if (form.locationId && !locationOptions.some((option) => option.value === form.locationId)) {
    locationOptions.push({ value: form.locationId, label: item.locationName || `Lokalizacja ${form.locationId}` });
  }

  function close() {
    if (!saving.current) onClose();
  }

  async function handleSave() {
    if (saving.current) return;
    saving.current = true;
    try {
      setIsSaving(true);

      const payload = packageFormPayload({ ...form, billingMode: isPeriodPackage(item) ? "PeriodBased" : "SessionBased" });

      const updated = await updatePackage(item.id, payload);
      onUpdated(updated);

      showOwnerSuccess("Zmiany w pakiecie zostały zapisane.", {
        id: "owner-package-update-success",
      });
      saving.current = false;
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          const fresh = await getPackage(item.id);
          onUpdated(fresh);
          setForm(createPackageForm(fresh));
        } catch { showOwnerError(new Error("Nie udało się odświeżyć oferty. Otwórz ją ponownie przed kolejną zmianą."), ""); }
      }
      showOwnerError(isPeriodPackage(item) ? new Error(periodPackageError(err)) : err, "Nie udało się zapisać zmian.", {
        id: "owner-package-update-error",
      });
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={close}>
      <div role="dialog" aria-modal="true" aria-label={periodBased ? "Edytuj ofertę usługi" : "Edytuj pakiet"} className="relative z-10 flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-high shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6 [&_input]:min-w-0 [&_textarea]:resize-y">
          <ModalHeader
            title={periodBased ? "Edytuj ofertę usługi" : "Edytuj pakiet"}
            description={periodBased ? "Zmiany dotyczą nowych okresów. Przypisane okresy zachowują swoją cenę i daty." : "Zmiany dotyczą warunków pakietu w ofercie."}
            icon={<Pencil size={20} />}
            onClose={close}
          />

          <fieldset disabled={isSaving} className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              className="md:col-span-2"
              label={periodBased ? "Nazwa usługi" : "Nazwa pakietu"}
              value={form.name}
              onChange={(value) => updateField("name", value)}
            />
            <div className="md:col-span-2">
              <fieldset disabled>
                <CustomSelect label="Sposób rozliczenia" value={form.billingMode} options={packageBillingModeOptions} onChange={() => {}} />
              </fieldset>
              <p className="mt-1.5 text-xs text-on-surface-muted">Aby zmienić sposób rozliczenia, dodaj nową ofertę.</p>
            </div>
            <TextField
              label={`Cena (${form.currency || "PLN"})`}
              value={form.price}
              onChange={(value) => updateField("price", value)}
              type="number"
              min={periodBased ? 0 : undefined}
              step="0.01"
            />
            {!periodBased ? (
              <TextField
                label={form.billingType === "5" ? "Liczba wejść" : "Limit sesji"}
                value={form.sessionsLimit}
                onChange={(value) => updateField("sessionsLimit", value)}
                type="number"
              />
            ) : null}
            <TextField
              label={periodBased ? "Czas trwania w dniach (1–3660)" : "Ważność w dniach"}
              type="number"
              min={periodBased ? 1 : undefined}
              max={periodBased ? 3660 : undefined}
              step="1"
              value={form.durationDays}
              onChange={(value) => updateField("durationDays", value)}
            />
            {!periodBased ? (
              <>
                <TextField label="Sesje / tydzień" type="number" value={form.sessionsPerWeek} onChange={(value) => updateField("sessionsPerWeek", value)} />
                <TextField label="Uczestnicy" type="number" value={form.participantsCount} onChange={(value) => updateField("participantsCount", value)} />
              </>
            ) : null}
            <TextField label="Waluta" value={form.currency} onChange={(value) => updateField("currency", value)} />
            <CustomSelect
              label="Lokalizacja"
              value={form.locationId}
              options={locationOptions}
              icon={<MapPin size={16} />}
              onChange={(value) => updateField("locationId", value)}
            />
            {!periodBased ? <PackagePublicationFields form={form} onChange={updateField} /> : null}
            <TextArea
              className="md:col-span-2"
              label="Opis"
              value={form.description}
              onChange={(value) => updateField("description", value)}
              rows={3}
            />
          </fieldset>
        </div>

        <ModalFooter className="justify-between bg-surface-container-high sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              disabled={isSaving}
              checked={form.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              className="h-5 w-5 atlas-brand-checkbox"
            />
            <span className="text-sm text-on-surface-variant">{periodBased ? "Oferta aktywna" : "Pakiet aktywny"}</span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={close} disabled={isSaving}>
              Anuluj
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || !form.name}>
              {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
