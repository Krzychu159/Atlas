"use client";

import { useState } from "react";
import { CustomSelect } from "@/app/components/ui/custom-select";

export default function BookingThresholdField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [unit, setUnit] = useState("1");
  const multiplier = Number(unit);
  return <div>
    <label className="block"><span className="mb-2 block text-label text-on-surface-muted">{label}</span>
      <input type="number" min="0" max={525600 / multiplier} step="any" value={value === "" ? "" : Number(value) / multiplier}
        onChange={event => onChange(event.target.value === "" ? "" : String(Number(event.target.value) * multiplier))}
        placeholder="Zachowaj obecny termin" className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
    <div className="mt-2"><CustomSelect label={`Jednostka: ${label}`} value={unit} onChange={setUnit} options={[{ value: "1", label: "Minuty" }, { value: "60", label: "Godziny" }, { value: "1440", label: "Dni" }]} /></div>
  </div>;
}
