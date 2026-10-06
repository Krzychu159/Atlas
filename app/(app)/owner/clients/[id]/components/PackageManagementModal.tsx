"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { ApiError, getErrorMessage } from "@/app/lib/backend";
import { dateInputToIsoDateTime, toDateInputValue } from "@/app/lib/formatters/date";
import { formatMoney } from "@/app/lib/formatters/money";
import { getPackages, type Package } from "@/app/lib/owner/packages";
import {
  closeClientPackage, correctClientPackage, deleteClientPackage, getClientBilling,
  getClientPackageManagementPreview, getPackageBlockerLabel, getPackageClosureLabel,
  getPackagePaymentStatusLabel, type ClientPackageBilling, type CloseClientPackagePayload,
  type CorrectClientPackagePayload, type PackageManagementPreview,
} from "@/app/lib/owner/billing";

type Mode = "overview" | "correct" | "delete" | "close";
const inputClass = "mt-1 w-full min-w-0 rounded-lg bg-surface-container-lowest p-3";

export default function PackageManagementModal({ clientId, packageData, onClose, onSaved }: {
  clientId: number; packageData: ClientPackageBilling; onClose: () => void;
  onSaved: (replacementClientPackageId?: number) => Promise<void>;
}) {
  const [preview, setPreview] = useState<PackageManagementPreview | null>(null);
  const [current, setCurrent] = useState(packageData);
  const [balance, setBalance] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Package[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [mode, setMode] = useState<Mode>("overview");
  const [step, setStep] = useState(1);
  const [sessions, setSessions] = useState(String(packageData.totalSessions));
  const [price, setPrice] = useState(String(packageData.totalPrice));
  const [validUntil, setValidUntil] = useState(toDateInputValue(packageData.validUntil));
  const [dueDate, setDueDate] = useState(toDateInputValue(packageData.paymentDueDate));
  const [reason, setReason] = useState("");
  const [debt, setDebt] = useState<CloseClientPackagePayload["debtDisposition"] | "">("");
  const [funds, setFunds] = useState<CloseClientPackagePayload["fundsDisposition"] | "">("");
  const [settlement, setSettlement] = useState("");
  const [replace, setReplace] = useState(false);
  const [replacementId, setReplacementId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [changed, setChanged] = useState(false);
  const saving = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    Promise.all([getClientPackageManagementPreview(clientId, packageData.clientPackageId), getClientBilling(clientId)])
      .then(([data, billing]) => {
        if (cancelled) return;
        const item = billing.packages?.find((item) => item.clientPackageId === packageData.clientPackageId);
        if (!item) throw new Error("Pakiet nie jest już dostępny. Odśwież widok klienta.");
        setCurrent(item); setBalance(billing.currentBalance); setPreview(data);
      }).catch((err) => { if (!cancelled) setError(getErrorMessage(err, "Nie udało się sprawdzić dostępnych działań. Otwórz pakiet ponownie.")); });
    getPackages().then((data) => { if (!cancelled) setCatalog(data.filter((item) => item.isActive)); })
      .catch((err) => { if (!cancelled) setCatalogError(getErrorMessage(err, "Nie udało się pobrać pakietów do wyboru. Otwórz okno ponownie, aby zmienić pakiet.")); });
    return () => { cancelled = true; alive.current = false; };
  }, [clientId, packageData.clientPackageId]);

  async function refreshContext() {
    const [latest, billing] = await Promise.all([getClientPackageManagementPreview(clientId, current.clientPackageId), getClientBilling(clientId)]);
    const updated = billing.packages?.find((item) => item.clientPackageId === current.clientPackageId);
    if (!updated) throw new Error("Pakiet nie jest już dostępny. Odśwież widok klienta.");
    if (alive.current) { setPreview(latest); setCurrent(updated); setBalance(billing.currentBalance); }
    return { latest, updated };
  }

  async function begin(next: Mode, withReplacement = false) {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const { latest, updated } = await refreshContext();
      const allowed = next === "correct" ? latest.canCorrect : next === "delete" ? latest.canDelete : latest.canClose;
      if (!allowed) { setError(next === "delete" ? getPackageBlockerLabel(latest.deleteBlockReason) : "Ta czynność nie jest już dostępna. Sprawdź aktualne dane i blokady pakietu."); return; }
      setMode(next); setChanged(false); setReason("");
      if (next === "correct") {
        setSessions(String(updated.totalSessions)); setPrice(String(updated.totalPrice));
        setValidUntil(toDateInputValue(updated.validUntil)); setDueDate(toDateInputValue(updated.paymentDueDate));
      }
      if (next === "close") { setStep(1); setDebt(""); setFunds(""); setSettlement(""); setReplace(withReplacement); setReplacementId(""); }
    } catch (err) { setPreview(null); setError(getErrorMessage(err, "Nie udało się sprawdzić dostępnych działań.")); }
    finally { saving.current = false; setBusy(false); }
  }

  function financialError() {
    if (!reason.trim()) return "Podaj powód zamknięcia lub zmiany pakietu.";
    if (!debt || !funds) return "Wybierz, co stanie się z należnością i wpłaconymi środkami.";
    if (funds !== "KeepFunds") {
      if (debt !== "WaiveDue") return "Przeniesienie środków na saldo lub zwrot wymaga umorzenia pozostałej należności.";
      if (!settlement.trim() || !Number.isFinite(Number(settlement)) || Number(settlement) <= 0) return "Podaj kwotę większą od zera.";
      if (Number(settlement) > current.amountPaid) return "Kwota rozliczenia nie może przekroczyć kwoty już opłaconej.";
    }
    return "";
  }

  async function save() {
    if (!preview || saving.current || changed || mode === "overview") return;
    setError(""); setNotice("");
    const correction: CorrectClientPackagePayload = { expectedVersion: preview.version, reason: reason.trim() };
    let closure: CloseClientPackagePayload | null = null;
    if (mode === "correct") {
      if (!reason.trim()) { setError("Podaj powód korekty."); return; }
      if ((!validUntil && current.validUntil) || (!dueDate && current.paymentDueDate)) { setError("Wybierz nową datę. Korekta nie usuwa wcześniej ustawionych dat."); return; }
      if (!sessions.trim() || !Number.isSafeInteger(Number(sessions)) || Number(sessions) < Math.max(current.usedSessions, 0)) { setError("Liczba wejść nie może być niższa od liczby wykorzystanych wejść."); return; }
      if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < Math.max(current.amountPaid, 0)) { setError("Cena nie może być niższa od kwoty już opłaconej."); return; }
      if (Number(sessions) !== current.totalSessions) correction.totalSessions = Number(sessions);
      if (Number(price) !== current.totalPrice) correction.totalPrice = Number(price);
      if (validUntil && validUntil !== toDateInputValue(current.validUntil)) correction.validUntil = dateInputToIsoDateTime(validUntil)!;
      if (dueDate && dueDate !== toDateInputValue(current.paymentDueDate)) correction.paymentDueDate = dateInputToIsoDateTime(dueDate)!;
      if (Object.keys(correction).length === 2) { setError("Zmień przynajmniej jedną wartość."); return; }
    }
    if (mode === "close") {
      const message = financialError();
      if (message || !debt || !funds) { setError(message); return; }
      if (replace && !catalog.some((item) => item.id === Number(replacementId))) { setError("Wybierz nowy pakiet."); return; }
      closure = { expectedVersion: preview.version, reason: reason.trim(), debtDisposition: debt, fundsDisposition: funds,
        settlementAmount: funds === "KeepFunds" ? 0 : Number(settlement),
        ...(replace ? { replacement: { clientId, packageId: Number(replacementId), purchaseDate: new Date().toISOString() } } : {}),
      };
    }
    saving.current = true; setBusy(true);
    let committed = false;
    let mutationStarted = false;
    try {
      const latest = await getClientPackageManagementPreview(clientId, current.clientPackageId);
      const allowed = mode === "correct" ? latest.canCorrect : mode === "delete" ? latest.canDelete : latest.canClose;
      if (JSON.stringify(latest.version) !== JSON.stringify(preview.version)) {
        setPreview(null); setChanged(true); await refreshContext();
        setError("Dane pakietu zmieniły się. Zachowaliśmy Twój formularz. Sprawdź aktualne dane i ponownie zatwierdź decyzję."); return;
      }
      setPreview(latest);
      if (!allowed) { setError(mode === "delete" ? getPackageBlockerLabel(latest.deleteBlockReason) : "Ta czynność jest teraz niedostępna. Sprawdź aktualne dane i blokady pakietu."); return; }
      if (mode !== "delete" && (preview.version === undefined || preview.version === null)) { setError("Nie udało się sprawdzić aktualności pakietu. Otwórz okno ponownie."); return; }
      let replacementClientPackageId: number | undefined;
      mutationStarted = true;
      if (mode === "delete") await deleteClientPackage(clientId, current.clientPackageId);
      else if (mode === "close" && closure) {
        const response = await closeClientPackage(clientId, current.clientPackageId, closure);
        replacementClientPackageId = response.replacementClientPackageId ?? undefined;
      } else await correctClientPackage(clientId, current.clientPackageId, correction);
      committed = true;
      await onSaved(replacementClientPackageId);
      if (mode === "delete") { onClose(); return; }
      await refreshContext(); setMode("overview"); setChanged(false);
      setNotice(mode === "close" ? funds === "Refund" ? "Pakiet został zamknięty. Zwrot oczekuje na wykonanie i potwierdzenie." : replacementClientPackageId ? "Pakiet został zmieniony. Nowy pakiet oznaczono w widoku klienta." : "Pakiet został zamknięty. Rozliczenie znajdziesz w jego szczegółach." : "Korekta została zapisana.");
    } catch (err) {
      setPreview(null);
      if (committed) { setMode("overview"); setError("Zmiana została zapisana, ale nie udało się odświeżyć wszystkich danych. Zamknij okno i odśwież widok klienta."); }
      else if (err instanceof ApiError && err.status === 409) {
        setChanged(true); setError("Dane pakietu zmieniły się. Zachowaliśmy Twój formularz. Sprawdź aktualne dane i ponownie zatwierdź decyzję.");
        try { await refreshContext(); } catch { setError("Nie udało się pobrać aktualnych danych. Formularz został zachowany. Spróbuj odświeżyć dane poniżej."); }
      } else if (mutationStarted && mode === "close" && (!(err instanceof ApiError) || err.status >= 500)) {
        setChanged(true); setError("Nie udało się potwierdzić zapisu. Przed kolejną próbą sprawdź aktualny stan pakietu — zamknięcie mogło już zostać zapisane.");
        try { await Promise.all([refreshContext(), onSaved()]); } catch { setError("Nie udało się sprawdzić wyniku zamknięcia. Formularz został zachowany. Odśwież dane przed dalszym działaniem."); }
      } else {
        setError(getErrorMessage(err, "Nie udało się zapisać zmiany pakietu."));
        try { await refreshContext(); } catch { /* Keep actions disabled until fresh data is available. */ }
      }
    } finally { saving.current = false; if (alive.current) setBusy(false); }
  }

  async function retryContext() {
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await refreshContext(); setError(mode === "overview" ? "" : "Sprawdź aktualne dane przed zatwierdzeniem."); if (mode !== "overview") setChanged(true); }
    catch (err) { setPreview(null); setError(getErrorMessage(err, "Nie udało się pobrać aktualnych danych pakietu.")); }
    finally { saving.current = false; setBusy(false); }
  }

  const comparisons = [
    ["Wszystkie wejścia", String(current.totalSessions), sessions],
    ["Cena", formatMoney(current.totalPrice, current.currency), price ? formatMoney(Number(price), current.currency) : "Podaj cenę"],
    ["Ważny do", toDateInputValue(current.validUntil), validUntil],
    ["Termin płatności", toDateInputValue(current.paymentDueDate), dueDate],
  ];
  const closeAllowed = Boolean(preview?.canClose);
  return <ModalOverlay onClose={busy ? undefined : onClose}>
    <section role="dialog" aria-modal="true" aria-label="Zarządzanie pakietem" className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 md:p-6">
      <ModalHeader title={mode === "correct" ? "Korekta pakietu" : mode === "delete" ? "Usuń pakiet" : mode === "close" ? replace ? "Zmień pakiet" : "Zamknij pakiet" : "Zarządzaj pakietem"} description={current.packageName || "Pakiet klienta"} onClose={() => { if (!busy) onClose(); }} />
      {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 text-sm text-tertiary-light">{notice}</p> : null}
      {!preview && !error ? <p className="mt-4" role="status">Sprawdzanie dostępnych działań…</p> : null}
      {!preview && error ? <Button className="mt-3" variant="secondary" disabled={busy} onClick={() => void retryContext()}>Odśwież dane pakietu</Button> : null}
      {preview ? <div className="mt-4 space-y-2 text-sm text-on-surface-variant">{(preview.blockers || []).map((blocker, index) => <p key={index}>{getPackageBlockerLabel(blocker)}</p>)}</div> : null}
      {mode === "overview" && preview ? <div className="mt-5 space-y-3">
        <PackageSummary packageData={current} amountDue={preview.amountDue} remaining={preview.remainingSessions} balance={balance} />
        <div className="flex flex-wrap gap-3">
          {preview.canCorrect ? <Button disabled={busy} onClick={() => void begin("correct")}>Korekta pakietu</Button> : null}
          {preview.canEdit ? <Button disabled variant="secondary">Edytuj</Button> : null}
          {preview.canClose ? <><Button disabled={busy} variant="secondary" onClick={() => void begin("close")}>Zamknij pakiet</Button><Button disabled={busy} variant="secondary" onClick={() => void begin("close", true)}>Zmień pakiet</Button></> : null}
          {preview.canDelete ? <Button disabled={busy} variant="danger" onClick={() => void begin("delete")}>Usuń</Button> : null}
        </div>
        {preview.canEdit ? <p className="text-xs text-on-surface-muted">Zwykła edycja nie jest jeszcze dostępna w tym panelu.</p> : null}
        {!preview.canDelete && preview.deleteBlockReason ? <p className="text-sm">{getPackageBlockerLabel(preview.deleteBlockReason)}</p> : null}
      </div> : null}
      {mode === "correct" ? <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">Wszystkie wejścia<input className={inputClass} type="number" min={current.usedSessions} step="1" required value={sessions} onChange={(event) => setSessions(event.target.value)} /></label>
          <label className="text-sm">Cena ({current.currency || "PLN"})<input className={inputClass} type="number" min={current.amountPaid} step="0.01" required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
          <label className="text-sm">Ważny do<input className={inputClass} type="date" required={Boolean(current.validUntil)} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label>
          <label className="text-sm">Termin płatności<input className={inputClass} type="date" required={Boolean(current.paymentDueDate)} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        </fieldset>
        <p className="text-xs text-on-surface-muted">Możesz zmienić datę. Korekta nie usuwa wcześniej ustawionych dat.</p>
        <label className="block text-sm">Powód korekty<textarea className={inputClass} required disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="space-y-2 rounded-lg bg-surface-container-lowest p-3 text-sm"><p className="font-semibold">Przed → Po</p>{comparisons.map(([label, before, after]) => <p key={label} className="break-words">{label}: {before || "Brak daty"} → {after || "Brak daty"}</p>)}</div>
        {changed && preview ? <Button type="button" variant="secondary" disabled={busy} onClick={() => { setChanged(false); setError(""); }}>Sprawdziłem aktualne dane</Button> : null}
        <div className="flex flex-wrap gap-3"><Button type="button" variant="ghost" disabled={busy} onClick={() => setMode("overview")}>Wróć</Button><Button type="submit" disabled={busy || changed || !preview?.canCorrect}>{busy ? "Zapisywanie…" : "Zatwierdź korektę"}</Button></div>
      </form> : null}
      {mode === "close" ? <div className="mt-5 space-y-4">
        <p className="text-label text-primary-light">Krok {step} z 3</p>
        {step === 1 ? <><PackageSummary packageData={current} amountDue={preview?.amountDue} remaining={preview?.remainingSessions} balance={balance} /><p className="text-sm text-on-surface-muted">Zamknięcie zachowuje historię pakietu. W kolejnym kroku zdecydujesz o jego rozliczeniu.</p><div className="flex flex-wrap gap-3"><Button disabled={busy} variant="ghost" onClick={() => setMode("overview")}>Wróć</Button><Button disabled={busy || !closeAllowed} onClick={() => setStep(2)}>Przejdź do rozliczenia</Button></div></> : null}
        {step === 2 ? <>
          <label className="block text-sm">Powód zamknięcia lub zmiany<textarea className={inputClass} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <fieldset disabled={busy} className="space-y-3 rounded-lg bg-surface-container-lowest p-4"><legend className="px-1 font-semibold">Pozostała należność</legend>
            <Decision checked={debt === "KeepDue"} name="debt" onChange={() => setDebt("KeepDue")} label="Pozostaw do zapłaty" description="Klient nadal będzie miał tę należność do opłacenia." />
            <Decision checked={debt === "WaiveDue"} name="debt" onChange={() => setDebt("WaiveDue")} label="Umórz należność" description="Klient nie będzie musiał opłacać pozostałej należności za ten pakiet." />
          </fieldset>
          <fieldset disabled={busy} className="space-y-3 rounded-lg bg-surface-container-lowest p-4"><legend className="px-1 font-semibold">Wpłacone środki</legend>
            <Decision checked={funds === "KeepFunds"} name="funds" onChange={() => setFunds("KeepFunds")} label="Pozostaw w pakiecie" description="Wpłacone środki pozostaną w rozliczeniu tego pakietu." />
            <Decision checked={funds === "Balance"} name="funds" onChange={() => setFunds("Balance")} label="Przenieś na saldo" description="Wskazaną kwotę klient wykorzysta w przyszłych rozliczeniach. Wymaga umorzenia należności." />
            <Decision checked={funds === "Refund"} name="funds" onChange={() => setFunds("Refund")} label="Zaplanuj zwrot" description="Zwrot będzie oczekiwał na wykonanie i osobne potwierdzenie przez studio. Wymaga umorzenia należności." />
          </fieldset>
          {funds === "Balance" || funds === "Refund" ? <label className="block text-sm">Kwota {funds === "Balance" ? "na saldo" : "zwrotu"} ({current.currency || "PLN"})<input className={inputClass} disabled={busy} type="number" min="0.01" max={current.amountPaid} step="0.01" value={settlement} onChange={(event) => setSettlement(event.target.value)} /></label> : null}
          <div className="flex flex-wrap gap-3"><Button disabled={busy} variant="ghost" onClick={() => setStep(1)}>Wróć</Button><Button disabled={busy || !closeAllowed} onClick={() => { const message = financialError(); setError(message); if (!message) setStep(3); }}>Przejdź do wyboru pakietu</Button></div>
        </> : null}
        {step === 3 ? <>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" disabled={busy} checked={replace} onChange={(event) => setReplace(event.target.checked)} />Przypisz nowy pakiet przy zamknięciu</label>
          {replace ? <><label className="block text-sm">Nowy pakiet<select className={inputClass} disabled={busy} value={replacementId} onChange={(event) => setReplacementId(event.target.value)}><option value="">Wybierz pakiet</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.price, item.currency)}{item.locationName ? ` · ${item.locationName}` : ""}</option>)}</select></label>{catalogError ? <p role="alert" className="text-sm text-error-light">{catalogError}</p> : !catalog.length ? <p className="text-sm text-on-surface-muted">Brak dostępnych pakietów do wyboru.</p> : null}<p className="text-sm text-on-surface-muted">Zamknięcie i przypisanie nowego pakietu zostaną zapisane razem.</p></> : null}
          <div className="space-y-2 rounded-lg bg-surface-container-lowest p-4 text-sm"><p className="font-semibold">Twoja decyzja</p><p className="break-words">Powód: {reason}</p><p>{debt === "KeepDue" ? "Należność pozostaje do zapłaty." : "Pozostała należność zostanie umorzona."}</p><p>{funds === "KeepFunds" ? "Wpłacone środki pozostają w pakiecie." : funds === "Balance" ? `Na saldo: ${formatMoney(Number(settlement), current.currency)}` : `Zwrot oczekujący: ${formatMoney(Number(settlement), current.currency)}`}</p>{replace ? <p>Nowy pakiet: {catalog.find((item) => item.id === Number(replacementId))?.name || "Wybierz pakiet"}</p> : null}</div>
          {changed && preview ? <><PackageSummary packageData={current} amountDue={preview.amountDue} remaining={preview.remainingSessions} balance={balance} /><Button disabled={busy} variant="secondary" onClick={() => { setChanged(false); setError(""); }}>Sprawdziłem aktualny stan pakietu</Button></> : null}
          <div className="flex flex-wrap gap-3"><Button disabled={busy} variant="ghost" onClick={() => setStep(2)}>Wróć</Button><Button disabled={busy || changed || !closeAllowed || (replace && !replacementId)} onClick={() => void save()}>{busy ? "Zapisywanie…" : replace ? "Zatwierdź zmianę pakietu" : "Zatwierdź zamknięcie"}</Button></div>
        </> : null}
      </div> : null}
      {mode === "delete" ? <div className="mt-5 space-y-4"><p className="text-sm">Usuniesz ten pakiet z historii klienta. Potwierdź, aby kontynuować.</p><div className="flex flex-wrap gap-3"><Button variant="ghost" disabled={busy} onClick={() => setMode("overview")}>Wróć</Button><Button variant="danger" disabled={busy || changed || !preview?.canDelete} onClick={() => void save()}>{busy ? "Usuwanie…" : "Potwierdź usunięcie"}</Button></div>{changed && preview ? <Button disabled={busy} variant="secondary" onClick={() => { setChanged(false); setError(""); }}>Sprawdziłem aktualne dane</Button> : null}</div> : null}
    </section>
  </ModalOverlay>;
}

function Decision({ checked, name, label, description, onChange }: { checked: boolean; name: string; label: string; description: string; onChange: () => void }) {
  return <label className="flex cursor-pointer items-start gap-3"><input type="radio" className="mt-1" name={name} checked={checked} onChange={onChange} /><span className="min-w-0 text-sm"><span className="block font-semibold">{label}</span><span className="mt-1 block text-on-surface-muted">{description}</span></span></label>;
}

function PackageSummary({ packageData, amountDue, remaining, balance }: { packageData: ClientPackageBilling; amountDue?: number; remaining?: number; balance: number | null }) {
  const fields = [
    ["Wykorzystane wejścia", `${packageData.usedSessions} / ${packageData.totalSessions}`],
    ["Pozostałe wejścia", remaining === undefined ? "Niedostępne" : String(remaining)],
    ["Opłacono", formatMoney(packageData.amountPaid, packageData.currency)],
    ["Do zapłaty", amountDue === undefined ? "Niedostępne" : formatMoney(amountDue, packageData.currency)],
    ["Saldo do wykorzystania", balance === null ? "Niedostępne" : formatMoney(balance, packageData.currency)],
    ["Płatność", getPackagePaymentStatusLabel(packageData.paymentStatus)],
    ["Zamknięcie", getPackageClosureLabel(packageData.closureDisposition)],
  ];
  return <dl className="grid min-w-0 grid-cols-1 gap-3 rounded-lg bg-surface-container-lowest p-4 text-sm sm:grid-cols-2">{fields.filter(([, value]) => value !== null).map(([label, value]) => <div key={label}><dt className="text-on-surface-muted">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}</dl>;
}
