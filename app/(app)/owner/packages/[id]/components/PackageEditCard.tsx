"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
import {
  updatePackage,
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
    try {
      setIsSaving(true);

      const payload = packageFormPayload(form);

      const updated = await updatePackage(item.id, payload);
      onUpdated(updated);

      showOwnerSuccess("Pakiet został zaktualizowany.", {
        id: "owner-package-update-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się zapisać zmian.", {
        id: "owner-package-update-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card-shell p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Edytuj Pakiet</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Zmieniaj nazwę, cenę oraz limity pakietu.
          </p>
        </div>
      </div>

      <TextField
        label="Nazwa pakietu"
        value={form.name}
        onChange={(value) => updateField("name", value)}
        className="mt-6"
      />

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
          />
        </div>

        <div>
          <TextField
            label={form.billingType === "5" ? "Liczba wejść" : "Sesje"}
            value={form.sessionsLimit}
            onChange={(value) => updateField("sessionsLimit", value)}
            type="number"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <TextField label="Ważność w dniach" type="number" value={form.durationDays}
          onChange={(value) => updateField("durationDays", value)} />
        <TextField label="Waluta" value={form.currency} onChange={(value) => updateField("currency", value)} />
        <TextField label="Sesje / tydzień" type="number" value={form.sessionsPerWeek}
          onChange={(value) => updateField("sessionsPerWeek", value)} />
        <TextField label="Uczestnicy" type="number" value={form.participantsCount}
          onChange={(value) => updateField("participantsCount", value)} />
        <label>
          <span className="text-label text-on-surface-muted">Lokalizacja</span>
          <CustomSelect className="mt-2" value={form.locationId} options={locationOptions}
            onChange={(value) => updateField("locationId", value)} />
        </label>
        <PackagePublicationFields form={form} onChange={updateField} />
      </div>

      <label className="mt-5 flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => updateField("isActive", event.target.checked)}
          className="h-5 w-5 accent-blue-600"
        />
        <span className="text-sm text-on-surface-variant">Pakiet aktywny</span>
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
