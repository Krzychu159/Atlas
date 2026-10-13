"use client";

import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
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

export default function PackageEditCard({
  item,
  onUpdated,
}: {
  item: Package;
  onUpdated: (item: Package) => void;
}) {
  const [form, setForm] = useState(() => createPackageForm(item));
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    getLocations().then((result) => { if (active) setLocations(result); })
      .catch((error) => { if (active) showOwnerError(error, "Nie udało się pobrać lokalizacji."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) setForm(createPackageForm(item)); });
    return () => { active = false; };
  }, [item]);

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
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try { onUpdated(await getPackage(item.id)); }
        catch { showOwnerError(new Error("Nie udało się odświeżyć oferty. Otwórz ją ponownie przed kolejną zmianą."), ""); }
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
    <div className="card-shell min-w-0 p-5 sm:p-6 [&_label]:block [&_input]:min-w-0 [&_textarea]:resize-y">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">{form.billingMode === "PeriodBased" ? "Edytuj ofertę usługi" : "Edytuj pakiet"}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {form.billingMode === "PeriodBased" ? "Zmieniaj warunki oferty dla nowych okresów. Przypisane okresy zachowują swoją cenę i daty." : "Zmieniaj nazwę, cenę oraz limity pakietu."}
          </p>
        </div>
      </div>

      <TextField
        label={form.billingMode === "PeriodBased" ? "Nazwa usługi" : "Nazwa pakietu"}
        value={form.name}
        onChange={(value) => updateField("name", value)}
        className="mt-6"
      />
      <fieldset disabled className="mt-4"><CustomSelect label="Sposób rozliczenia" value={form.billingMode} options={packageBillingModeOptions} onChange={() => {}} /></fieldset>
      <p className="mt-2 text-xs text-on-surface-muted">Aby zmienić sposób rozliczenia, dodaj nową ofertę.</p>

      <TextArea
        label="Opis"
        value={form.description}
        onChange={(value) => updateField("description", value)}
        rows={3}
        className="mt-4"
      />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <TextField
            label={`Cena (${form.currency || "PLN"})`}
            value={form.price}
            onChange={(value) => updateField("price", value)}
            type="number"
            min={form.billingMode === "PeriodBased" ? 0 : undefined}
            step="0.01"
          />
        </div>

        {form.billingMode === "SessionBased" ? <div>
          <TextField
            label={form.billingType === "5" ? "Liczba wejść" : "Sesje"}
            value={form.sessionsLimit}
            onChange={(value) => updateField("sessionsLimit", value)}
            type="number"
          />
        </div> : null}
      </div>

      <div className="mt-4 grid gap-4">
        <TextField label={form.billingMode === "PeriodBased" ? "Czas trwania w dniach (1–3660)" : "Ważność w dniach"} type="number" min={form.billingMode === "PeriodBased" ? 1 : undefined} max={form.billingMode === "PeriodBased" ? 3660 : undefined} step="1" value={form.durationDays}
          onChange={(value) => updateField("durationDays", value)} />
        <TextField label="Waluta" value={form.currency} onChange={(value) => updateField("currency", value)} />
        {form.billingMode === "SessionBased" ? <>
          <TextField label="Sesje / tydzień" type="number" value={form.sessionsPerWeek} onChange={(value) => updateField("sessionsPerWeek", value)} />
          <TextField label="Uczestnicy" type="number" value={form.participantsCount} onChange={(value) => updateField("participantsCount", value)} />
        </> : null}
        <label>
          <span className="text-label text-on-surface-muted">Lokalizacja</span>
          <CustomSelect className="mt-2" value={form.locationId} options={locationOptions}
            onChange={(value) => updateField("locationId", value)} />
        </label>
        {form.billingMode === "SessionBased" ? <PackagePublicationFields form={form} onChange={updateField} /> : null}
      </div>

      <label className="mt-5 !flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => updateField("isActive", event.target.checked)}
          className="h-5 w-5 accent-blue-600"
        />
        <span className="text-sm text-on-surface-variant">{form.billingMode === "PeriodBased" ? "Oferta aktywna" : "Pakiet aktywny"}</span>
      </label>

      <Button
        onClick={handleSave}
        disabled={isSaving || !form.name}
        className="mt-6 h-14 w-full"
        icon={<Save size={17} />}
      >
        {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
      </Button>
    </div>
  );
}
