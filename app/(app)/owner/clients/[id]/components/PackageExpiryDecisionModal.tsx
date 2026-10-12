"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getErrorMessage } from "@/app/lib/backend";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalHeader, ModalFooter, ModalOverlay } from "@/app/components/ui/modal";
import { canDecidePackageExpiry, formatPackageInstant, localPackageInstantToUtc } from "@/app/lib/package-validity";
import { decideClientPackageExpiry, getClientBilling, getClientPackageManagementPreview, type ClientPackageBilling, type PackageManagementPreview } from "@/app/lib/owner/billing";

function decisionError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 403) return "Nie masz uprawnień do podjęcia tej decyzji.";
  if (error instanceof ApiError && error.status === 404) return "Pakiet nie jest dostępny lub nie masz do niego dostępu.";
  return getErrorMessage(error, fallback);
}

export default function PackageExpiryDecisionModal({ clientId, packageData, onClose, onSaved }: {
  clientId: number; packageData: ClientPackageBilling; onClose: () => void;
  onSaved: (replacementId?: number) => Promise<void>;
}) {
  const [current, setCurrent] = useState(packageData);
  const [preview, setPreview] = useState<PackageManagementPreview | null>(null);
  const [action, setAction] = useState<"Extend" | "End">("Extend");
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reviewRequired, setReviewRequired] = useState(false);
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const [latest, billing] = await Promise.all([getClientPackageManagementPreview(clientId, packageData.clientPackageId), getClientBilling(clientId)]);
    const item = billing.packages?.find(item => item.clientPackageId === packageData.clientPackageId);
    if (!item) throw new Error("Pakiet nie jest już dostępny. Odśwież widok klienta.");
    if (alive.current) { setPreview(latest); setCurrent(item); }
  }, [clientId, packageData.clientPackageId]);

  useEffect(() => {
    alive.current = true;
    void refresh().catch(err => { if (alive.current) setError(decisionError(err, "Nie udało się pobrać aktualnych danych pakietu.")); })
      .finally(() => { if (alive.current) setBusy(false); });
    return () => { alive.current = false; };
  }, [refresh]);

  async function reload() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await refresh(); setReviewRequired(true); setError("Sprawdź aktualne dane przed ponownym zatwierdzeniem."); }
    catch (err) { setPreview(null); setError(decisionError(err, "Nie udało się odświeżyć pakietu.")); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  async function submit() {
    if (lock.current || busy || saved || reviewRequired || !preview || preview.version == null || !canDecidePackageExpiry(current)) return;
    if (!reason.trim()) { setError("Podaj powód decyzji."); return; }
    const utc = action === "Extend" ? localPackageInstantToUtc(validUntil) : null;
    if (action === "Extend" && (!utc || Date.parse(utc) <= Date.now())) { setError("Wybierz poprawną datę i godzinę w przyszłości."); return; }
    lock.current = true; setBusy(true); setError("");
    let committed = false;
    try {
      const result = await decideClientPackageExpiry(clientId, current.clientPackageId, {
        action, expectedVersion: preview.version, reason: reason.trim(), ...(utc ? { validUntil: utc } : {}),
      });
      committed = true; setSaved(true);
      await onSaved(result?.replacementClientPackageId ?? undefined);
      onClose();
    } catch (err) {
      if (committed) { setError("Decyzja została zapisana, ale nie udało się odświeżyć widoku. Zamknij okno i odśwież dane klienta."); }
      else if (err instanceof ApiError && err.status === 409) {
        setPreview(null); setReviewRequired(true);
        setError("Dane pakietu zmieniły się. Formularz został zachowany. Sprawdź aktualne dane i ponownie zatwierdź decyzję.");
        try { await refresh(); } catch { setError("Nie udało się pobrać aktualnych danych. Odśwież pakiet przed ponowną decyzją."); }
      } else {
        setError(decisionError(err, "Nie udało się zapisać decyzji. Sprawdź datę ważności i aktualny stan pakietu."));
        if (!(err instanceof ApiError) || err.status >= 500) { setPreview(null); setReviewRequired(true); }
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  return <ModalOverlay onClose={busy ? undefined : onClose}>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container">
      <div className="overflow-y-auto p-5 sm:p-6">
        <ModalHeader title="Przedłuż lub zakończ pakiet" description={current.packageName || "Pakiet klienta"} onClose={() => { if (!busy) onClose(); }} />
        <p className="mt-4 text-sm text-on-surface-variant">Ważność minęła: {formatPackageInstant(current.validUntil)}. Pozostałe wejścia: {current.remainingSessions ?? "Brak danych"}.</p>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">Niewykorzystane wejścia nie przechodzą automatycznie na kolejny pakiet. Zakończenie pakietu nie oznacza zwrotu pieniędzy. Pakiety grupowe nie odnawiają się automatycznie.</p>
        {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
        {busy ? <p role="status" className="mt-4 text-sm">Sprawdzanie i zapisywanie danych…</p> : null}
        {!busy && !canDecidePackageExpiry(current) ? <p className="mt-4 text-sm">Pakiet nie wymaga już decyzji o wygaśnięciu.</p> : null}
        <fieldset disabled={busy || saved} className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-3"><Button type="button" variant={action === "Extend" ? "primary" : "secondary"} onClick={() => setAction("Extend")}>Przedłuż</Button><Button type="button" variant={action === "End" ? "primary" : "secondary"} onClick={() => setAction("End")}>Zakończ pakiet</Button></div>
          {action === "Extend" ? <><TextField className="block" label="Nowa data i godzina ważności" type="datetime-local" required value={validUntil} onChange={setValidUntil} /><p className="text-xs text-on-surface-muted">Pakiet będzie ważny do wskazanej godziny w Twojej lokalnej strefie czasowej.</p></> : null}
          <TextArea className="block" label="Powód decyzji" required value={reason} onChange={setReason} rows={3} />
        </fieldset>
        {!busy && (!preview || preview.version == null) && !saved ? <Button type="button" className="mt-4" variant="secondary" onClick={() => void reload()}>Odśwież dane pakietu</Button> : null}
        {reviewRequired && preview && !busy ? <Button type="button" className="mt-4" variant="secondary" onClick={() => { setReviewRequired(false); setError(""); }}>Sprawdziłem aktualne dane</Button> : null}
      </div>
      <ModalFooter><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Zamknij</Button><Button type="submit" disabled={busy || saved || reviewRequired || !preview || preview.version == null || !canDecidePackageExpiry(current)}>{action === "Extend" ? "Przedłuż pakiet" : "Zakończ pakiet"}</Button></ModalFooter>
    </form>
  </ModalOverlay>;
}
