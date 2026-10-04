"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { ApiError, getErrorMessage } from "@/app/lib/backend";
import { correctClientPackage, deleteClientPackage, getClientBilling, getClientPackageManagementPreview, getPackageBlockerLabel, type ClientPackageBilling, type CorrectClientPackagePayload, type PackageManagementPreview } from "@/app/lib/owner/billing";

export default function PackageManagementModal({ clientId, packageData, onClose, onSaved }: {
  clientId: number;
  packageData: ClientPackageBilling;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<PackageManagementPreview | null>(null);
  const [current, setCurrent] = useState(packageData);
  const [mode, setMode] = useState<"overview" | "correct" | "delete">("overview");
  const [sessions, setSessions] = useState(String(packageData.totalSessions));
  const [price, setPrice] = useState(String(packageData.totalPrice));
  const [validUntil, setValidUntil] = useState(dateInput(packageData.validUntil));
  const [dueDate, setDueDate] = useState(dateInput(packageData.paymentDueDate));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getClientPackageManagementPreview(clientId, packageData.clientPackageId).then((data) => {
      if (!cancelled) setPreview(data);
    }).catch((err) => {
      if (!cancelled) setError(getErrorMessage(err, "Nie udało się sprawdzić dostępnych działań. Otwórz pakiet ponownie."));
    });
    return () => { cancelled = true; };
  }, [clientId, packageData.clientPackageId]);

  async function save() {
    if (!preview || saving.current || changed) return;
    setError("");
    const payload: CorrectClientPackagePayload = { expectedVersion: preview.version, reason: reason.trim() };
    if (mode === "correct") {
      if (!preview.canCorrect || preview.version === undefined || preview.version === null) return;
      if (!reason.trim()) { setError("Podaj powód korekty."); return; }
      if ((!validUntil && current.validUntil) || (!dueDate && current.paymentDueDate)) {
        setError("Nie można jeszcze usuwać dat. Wybierz nową datę zamiast pozostawiać puste pole."); return;
      }
      if (!sessions.trim() || !Number.isInteger(Number(sessions)) || Number(sessions) < current.usedSessions || Number(sessions) < 0) {
        setError("Liczba wejść nie może być niższa od liczby wykorzystanych wejść."); return;
      }
      if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < current.amountPaid || Number(price) < 0) {
        setError("Cena nie może być niższa od kwoty już opłaconej."); return;
      }
      if (Number(sessions) !== current.totalSessions) payload.totalSessions = Number(sessions);
      if (Number(price) !== current.totalPrice) payload.totalPrice = Number(price);
      if (validUntil !== dateInput(current.validUntil)) payload.validUntil = toUtc(validUntil);
      if (dueDate !== dateInput(current.paymentDueDate)) payload.paymentDueDate = toUtc(dueDate);
      if (Object.keys(payload).length === 2) { setError("Zmień przynajmniej jedną wartość."); return; }
    }
    saving.current = true;
    setBusy(true);
    let committed = false;
    try {
      if (mode === "delete") {
        const latest = await getClientPackageManagementPreview(clientId, current.clientPackageId);
        setPreview(latest);
        if (!latest.canDelete) { setError(getPackageBlockerLabel(latest.deleteBlockReason)); return; }
        await deleteClientPackage(clientId, current.clientPackageId);
      } else {
        await correctClientPackage(clientId, current.clientPackageId, payload);
      }
      committed = true;
      await onSaved();
      onClose();
    } catch (err) {
      if (committed) {
        setMode("overview");
        setPreview(null);
        setError("Zmiana została zapisana, ale nie udało się odświeżyć widoku. Zamknij okno i odśwież stronę.");
      } else if (err instanceof ApiError && err.status === 409) {
        setPreview(null);
        setChanged(true);
        setError("Dane pakietu zmieniły się. Twoje wpisane wartości zostały zachowane. Sprawdź aktualne dane i ponownie zatwierdź korektę.");
        try {
          const [latest, billing] = await Promise.all([
            getClientPackageManagementPreview(clientId, current.clientPackageId), getClientBilling(clientId),
          ]);
          const updated = billing.packages?.find((item) => item.clientPackageId === current.clientPackageId);
          if (updated) { setCurrent(updated); setPreview(latest); }
        } catch { setError("Nie udało się pobrać aktualnych danych. Twoje wpisane wartości zostały zachowane. Otwórz pakiet ponownie po odświeżeniu strony."); }
      } else setError(getErrorMessage(err, "Nie udało się zapisać zmiany pakietu."));
    } finally { saving.current = false; setBusy(false); }
  }

  const comparisons = [
    ["Wszystkie wejścia", String(current.totalSessions), sessions],
    ["Cena", String(current.totalPrice), price],
    ["Ważny do", dateInput(current.validUntil), validUntil],
    ["Termin płatności", dateInput(current.paymentDueDate), dueDate],
  ];
  return (
    <ModalOverlay onClose={busy ? undefined : onClose}>
      <section role="dialog" aria-modal="true" aria-label="Zarządzanie pakietem" className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 md:p-6">
        <ModalHeader title={mode === "correct" ? "Korekta pakietu" : mode === "delete" ? "Usuń pakiet" : "Zarządzaj pakietem"} description={current.packageName || "Pakiet klienta"} onClose={() => { if (!busy) onClose(); }} />
        {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
        {!preview && !error ? <p className="mt-4">Sprawdzanie dostępnych działań…</p> : null}
        {mode === "overview" && preview ? <div className="mt-5 space-y-3">
          <p className="text-sm">Pozostało {preview.remainingSessions} wejść. Do zapłaty: {preview.amountDue.toLocaleString("pl-PL")} {current.currency || "PLN"}.</p>
          <div className="flex flex-wrap gap-3">
            {preview.canCorrect ? <Button onClick={() => setMode("correct")}>Korekta pakietu</Button> : null}
            {preview.canDelete ? <Button variant="danger" onClick={() => setMode("delete")}>Usuń</Button> : null}
          </div>
          {preview.canEdit || preview.canClose ? <p className="text-sm text-on-surface-muted">Edycja i zamknięcie pakietu nie są jeszcze dostępne w tym panelu.</p> : null}
          {!preview.canDelete && preview.deleteBlockReason ? <p className="text-sm">{getPackageBlockerLabel(preview.deleteBlockReason)}</p> : null}
          {(preview.blockers || []).map((blocker, index) => <p key={index} className="text-sm text-on-surface-variant">{getPackageBlockerLabel(blocker)}</p>)}
        </div> : null}
        {mode === "correct" ? <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">Wszystkie wejścia<input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3" type="number" min={current.usedSessions} step="1" required value={sessions} onChange={(event) => setSessions(event.target.value)} /></label>
            <label className="text-sm">Cena ({current.currency || "PLN"})<input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3" type="number" min={current.amountPaid} step="0.01" required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
            <label className="text-sm">Ważny do<input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label>
            <label className="text-sm">Termin płatności<input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>
          <label className="block text-sm">Powód korekty<textarea className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3" required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="space-y-2 rounded-lg bg-surface-container-lowest p-3 text-sm">
            <p className="font-semibold">Przed → Po</p>
            {comparisons.map(([label, before, after]) => <p key={label} className="break-words">{label}: {before || "Brak daty"} → {after || "Brak daty"}</p>)}
          </div>
          {changed && preview ? <Button type="button" variant="secondary" onClick={() => { setChanged(false); setError(""); }}>Sprawdziłem aktualne dane</Button> : null}
          <Button type="submit" disabled={busy || changed || !preview?.canCorrect}>{busy ? "Zapisywanie…" : "Zatwierdź korektę"}</Button>
        </form> : null}
        {mode === "delete" ? <div className="mt-5 space-y-4"><p className="text-sm">Usuniesz ten pakiet z historii klienta. Potwierdź, aby kontynuować.</p><Button variant="danger" disabled={busy || !preview?.canDelete} onClick={() => void save()}>{busy ? "Usuwanie…" : "Potwierdź usunięcie"}</Button></div> : null}
      </section>
    </ModalOverlay>
  );
}

function dateInput(value: string | null) { return value ? value.slice(0, 10) : ""; }
function toUtc(value: string) { return value ? new Date(`${value}T00:00:00Z`).toISOString() : null; }
