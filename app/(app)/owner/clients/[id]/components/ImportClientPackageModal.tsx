"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { ApiError, getErrorMessage } from "@/app/lib/backend";
import { dateInputToIsoDateTime } from "@/app/lib/formatters/date";
import { formatMoney } from "@/app/lib/formatters/money";
import { importClientPackage, type ImportClientPackagePayload } from "@/app/lib/owner/billing";
import { getPackages, type Package } from "@/app/lib/owner/packages";

const inputClass = "mt-1 w-full min-w-0 rounded-lg bg-surface-container-lowest p-3";

// Keep this component mounted when closed: an uncertain result must retain its requestId.
export default function ImportClientPackageModal({ open, clientId, onClose, onSaved }: {
  open: boolean; clientId: number; onClose: () => void; onSaved: (clientPackageId: number) => Promise<void>;
}) {
  const [catalog, setCatalog] = useState<Package[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [packageId, setPackageId] = useState("");
  const [totalSessions, setTotalSessions] = useState("");
  const [usedSessions, setUsedSessions] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const attempt = useRef<ImportClientPackagePayload | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setCatalogLoading(true); setCatalogError("");
      getPackages().then((data) => { if (!cancelled) setCatalog(data.filter((item) => item.isActive)); })
        .catch((err) => { if (!cancelled) setCatalogError(getErrorMessage(err, "Nie udało się pobrać dostępnych pakietów.")); })
        .finally(() => { if (!cancelled) setCatalogLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, catalogRetry]);

  async function submit() {
    if (saving.current) return;
    setError("");
    if (!attempt.current && savedId === null) {
      const selected = catalog.find((item) => item.id === Number(packageId));
      const sessions = Number(totalSessions), used = Number(usedSessions);
      const price = Number(totalPrice), paid = Number(amountPaid);
      const purchaseIso = dateInputToIsoDateTime(purchaseDate), validityIso = dateInputToIsoDateTime(validUntil);
      if (!selected) { setError("Wybierz pakiet katalogowy."); return; }
      if (!totalSessions.trim() || !Number.isSafeInteger(sessions) || sessions < 1 || !usedSessions.trim() || !Number.isSafeInteger(used) || used < 0 || used >= sessions) { setError("Podaj liczbę wejść. Pakiet musi mieć co najmniej jedno niewykorzystane wejście."); return; }
      if (!totalPrice.trim() || !amountPaid.trim() || !Number.isFinite(price) || !Number.isFinite(paid) || price < 0 || paid < 0 || paid > price) { setError("Cena i kwota opłacona nie mogą być ujemne. Kwota opłacona nie może przekroczyć ceny."); return; }
      if (!purchaseIso || !validityIso) { setError("Podaj datę zakupu i ważności pakietu."); return; }
      if (!reason.trim()) { setError("Podaj powód wprowadzenia stanu początkowego."); return; }
      attempt.current = {
        requestId: crypto.randomUUID(), reason: reason.trim(), usedSessions: used, amountPaid: paid,
        package: { clientId, packageId: selected.id, totalSessions: sessions, totalPrice: price, purchaseDate: purchaseIso, validUntil: validityIso },
      };
      setLocked(true);
    }
    saving.current = true; setBusy(true);
    let committed = savedId !== null;
    try {
      let id = savedId;
      if (id === null && attempt.current) {
        const response = await importClientPackage(attempt.current);
        id = response.id; setSavedId(id); committed = true;
      }
      if (id === null) return;
      await onSaved(id);
      attempt.current = null; setSavedId(null); setLocked(false);
      setPackageId(""); setTotalSessions(""); setUsedSessions(""); setTotalPrice(""); setAmountPaid(""); setPurchaseDate(""); setValidUntil(""); setReason("");
      onClose();
    } catch (err) {
      if (committed) setError("Stan początkowy został zapisany. Nie udało się odświeżyć widoku — użyj przycisku poniżej, aby ponownie pobrać dane.");
      else if (err instanceof ApiError && err.status >= 400 && err.status < 500 && ![408, 409, 425, 429].includes(err.status)) {
        attempt.current = null; setLocked(false);
        setError(getErrorMessage(err, "Nie udało się wprowadzić pakietu. Sprawdź wpisane dane."));
      } else setError(getErrorMessage(err, "Nie udało się potwierdzić zapisu. Ponów zapis tych samych danych. Wpisane wartości zostały zachowane."));
    } finally { saving.current = false; setBusy(false); }
  }

  if (!open) return null;
  const selected = catalog.find((item) => item.id === Number(packageId));
  return <ModalOverlay onClose={busy ? undefined : onClose}>
    <section role="dialog" aria-modal="true" aria-label="Wprowadź trwający pakiet" className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 md:p-6">
      <ModalHeader title="Wprowadź trwający pakiet" description="Przenieś aktualny stan pakietu klienta do ATLAS." onClose={() => { if (!busy) onClose(); }} />
      <p className="mt-4 text-sm text-on-surface-variant">Kwota opłacona jest stanem początkowym. Nie dodaje nowej wpłaty ani treningów do historii i nie wykorzystuje salda klienta.</p>
      {catalogError ? <div className="mt-3"><p role="alert" className="text-sm text-error-light">{catalogError}</p><Button variant="secondary" className="mt-2" disabled={busy} onClick={() => setCatalogRetry((value) => value + 1)}>Pobierz pakiety ponownie</Button></div> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
      {locked && savedId === null ? <p className="mt-3 text-sm text-on-surface-muted">Zachowaliśmy te dane do ponowienia zapisu. Najpierw rozstrzygnij tę próbę, zanim wprowadzisz inny pakiet.</p> : null}
      <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <fieldset disabled={busy || locked || catalogLoading} className="space-y-4">
          <label className="block text-sm">Pakiet katalogowy<select className={inputClass} required value={packageId} onChange={(event) => { const item = catalog.find((item) => item.id === Number(event.target.value)); setPackageId(event.target.value); setTotalSessions(item ? String(item.sessionsLimit) : ""); setTotalPrice(item ? String(item.price) : ""); }}><option value="">{catalogLoading ? "Pobieranie pakietów…" : "Wybierz pakiet"}</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.price, item.currency)}{item.locationName ? ` · ${item.locationName}` : ""}</option>)}</select></label>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">Wszystkie wejścia<input className={inputClass} type="number" min="1" step="1" required value={totalSessions} onChange={(event) => setTotalSessions(event.target.value)} /></label>
            <label className="text-sm">Wykorzystane wejścia<input className={inputClass} type="number" min="0" max={Math.max(Number(totalSessions) - 1, 0)} step="1" required value={usedSessions} onChange={(event) => setUsedSessions(event.target.value)} /></label>
            <label className="text-sm">Cena ({selected?.currency || "PLN"})<input className={inputClass} type="number" min="0" step="0.01" required value={totalPrice} onChange={(event) => setTotalPrice(event.target.value)} /></label>
            <label className="text-sm">Opłacono ({selected?.currency || "PLN"})<input className={inputClass} type="number" min="0" max={Number(totalPrice) || 0} step="0.01" required value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} /></label>
            <label className="text-sm">Data zakupu<input className={inputClass} type="date" required value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /></label>
            <label className="text-sm">Ważny do<input className={inputClass} type="date" required value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label>
          </div>
          <label className="block text-sm">Powód wprowadzenia<textarea className={inputClass} required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </fieldset>
        <Button type="submit" className="w-full sm:w-auto" disabled={busy || (!locked && (catalogLoading || Boolean(catalogError)))}>{busy ? "Zapisywanie…" : savedId !== null ? "Odśwież dane klienta" : locked ? "Ponów zapis tych samych danych" : "Wprowadź stan początkowy"}</Button>
      </form>
    </section>
  </ModalOverlay>;
}
