"use client";

import { useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/app/lib/backend";
import { getTrainer, isActiveTrainer, type Trainer } from "@/app/lib/owner/trainers";
import { OwnerRemoteSelect } from "./OwnerRemoteSelect";

export function OwnerTrainerAssignmentSelect({ value, onChange, onCheckingChange, onTrainerLoaded, locationId, initialName, requireActive = true }: {
  value: string; onChange: (value: string) => void; onCheckingChange: (checking: boolean) => void;
  onTrainerLoaded?: (trainer: Trainer | null) => void; locationId?: number | null;
  initialName?: string; requireActive?: boolean;
}) {
  const request = useRef<AbortController | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { request.current?.abort(); request.current = null; onCheckingChange(false); }, [locationId, onCheckingChange]);

  async function choose(next: string) {
    if (request.current) return;
    setError("");
    if (!next) { onTrainerLoaded?.(null); onChange(""); return; }
    const controller = new AbortController();
    request.current = controller; setChecking(true); onCheckingChange(true);
    try {
      const trainer = await getTrainer(Number(next), controller.signal);
      if (controller.signal.aborted) return;
      if (trainer.id !== Number(next)) throw new Error("Nie udało się sprawdzić wybranego trenera.");
      if (requireActive && !isActiveTrainer(trainer)) throw new Error("Ten trener nie jest aktywny. Wybierz innego trenera.");
      if (locationId != null && !trainer.locationIds?.includes(locationId)) throw new Error("Ten trener nie jest przypisany do wybranej lokalizacji.");
      onTrainerLoaded?.(trainer); onChange(next);
    } catch (err) {
      if (!controller.signal.aborted) setError(getErrorMessage(err, "Nie udało się sprawdzić trenera. Spróbuj ponownie."));
    } finally {
      if (request.current === controller) { request.current = null; setChecking(false); onCheckingChange(false); }
    }
  }

  return <div className="mt-2">
    <fieldset disabled={checking} className="min-w-0">
      <OwnerRemoteSelect kind="trainers" label="Trener" value={value} onChange={next => void choose(next)} locationId={locationId} initialName={initialName} allowAll={false} emptyLabel="Bez przypisanego trenera" />
    </fieldset>
    {checking ? <p role="status" className="mt-2 text-xs text-on-surface-muted">Sprawdzanie trenera…</p> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-error-light">{error}</p> : null}
  </div>;
}
