"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
import {
  updatePackage,
  type Package,
  type UpdatePackagePayload,
} from "@/app/lib/owner/packages";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../../../components/owner-toast";

type FormState = {
  name: string;
  description: string;
  price: string;
  sessionsLimit: string;
  durationDays: string;
  isActive: boolean;
};

export default function PackageEditCard({
  item,
  onUpdated,
}: {
  item: Package;
  onUpdated: (item: Package) => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: item.name,
    description: item.description || "",
    price: String(item.price),
    sessionsLimit: String(item.sessionsLimit),
    durationDays: String(item.durationDays),
    isActive: item.isActive,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setForm({
        name: item.name,
        description: item.description || "",
        price: String(item.price),
        sessionsLimit: String(item.sessionsLimit),
        durationDays: String(item.durationDays),
        isActive: item.isActive,
      });
    });
  }, [item]);

  function updateField(field: keyof FormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      const payload: UpdatePackagePayload = {
        name: form.name,
        description: form.description,
        price: Number(form.price || 0),
        currency: item.currency || "PLN",
        sessionsLimit: Number(form.sessionsLimit || 0),
        durationDays: Number(form.durationDays || 0),
        isActive: form.isActive,
      };

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
            label={`Cena (${item.currency || "PLN"})`}
            value={form.price}
            onChange={(value) => updateField("price", value)}
            type="number"
          />
        </div>

        <div>
          <TextField
            label="Sesje"
            value={form.sessionsLimit}
            onChange={(value) => updateField("sessionsLimit", value)}
            type="number"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-label text-on-surface-variant">
          Ważność pakietu: {form.durationDays || 0} dni
        </label>
        <input
          value={form.durationDays}
          onChange={(event) => updateField("durationDays", event.target.value)}
          type="range"
          min={7}
          max={120}
          className="mt-4 w-full accent-blue-600"
        />
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
