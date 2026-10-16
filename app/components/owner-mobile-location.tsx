"use client";

import { LocateFixed } from "lucide-react";
import { OWNER_LOCATION_ALL, useOwnerLocationOptions } from "@/app/lib/owner/location-filter";

/**
 * Compact location switcher for the phone and tablet topbar (the desktop topbar shows the full select).
 * It shares the stored selection with the desktop switcher; the system picker opens on tap.
 */
export function OwnerLocationIconPicker({ className = "" }: { className?: string }) {
  const { options, status, selectedLocationValue, setSelectedLocationValue } = useOwnerLocationOptions(true);
  const current = options.find((option) => option.value === selectedLocationValue)?.label ?? "Wszystkie lokalizacje";
  const scoped = selectedLocationValue !== OWNER_LOCATION_ALL;
  const label = status === "error"
    ? `Lokalizacja: ${current}. Nie udało się wczytać listy lokalizacji.`
    : `Lokalizacja: ${current}`;

  return (
    <div
      title={label}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-light transition hover:bg-surface-container-high focus-within:shadow-[0_0_0_2px_var(--color-primary-light)] ${scoped ? "bg-primary/15" : ""} ${className}`}
    >
      <LocateFixed size={21} aria-hidden="true" />
      {scoped ? <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" /> : null}
      <select
        aria-label={label}
        value={selectedLocationValue}
        onChange={(event) => setSelectedLocationValue(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
