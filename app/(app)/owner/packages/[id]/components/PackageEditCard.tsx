"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  updatePackage,
  type Package,
  type UpdatePackagePayload,
} from "@/app/lib/owner/packages";
import { toast } from "sonner";

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
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      sessionsLimit: String(item.sessionsLimit),
      durationDays: String(item.durationDays),
      isActive: item.isActive,
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

      toast.success("Pakiet został zaktualizowany.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nie udało się zapisać zmian.";

      toast.error(message);
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

      <div className="mt-6">
        <label className="text-label text-on-surface-variant">
          Nazwa pakietu
        </label>
        <input
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none"
        />
      </div>

      <div className="mt-4">
        <label className="text-label text-on-surface-variant">Opis</label>
        <textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-4 outline-none resize-none"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-label text-on-surface-variant">
            Cena ({item.currency || "PLN"})
          </label>
          <input
            value={form.price}
            onChange={(event) => updateField("price", event.target.value)}
            type="number"
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none"
          />
        </div>

        <div>
          <label className="text-label text-on-surface-variant">Sesje</label>
          <input
            value={form.sessionsLimit}
            onChange={(event) =>
              updateField("sessionsLimit", event.target.value)
            }
            type="number"
            className="mt-2 h-14 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 outline-none"
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

      <button
        onClick={handleSave}
        disabled={isSaving || !form.name}
        className="mt-6 h-14 w-full rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold flex items-center justify-center gap-3 disabled:opacity-60"
      >
        <Save size={17} />
        {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
      </button>
    </div>
  );
}
