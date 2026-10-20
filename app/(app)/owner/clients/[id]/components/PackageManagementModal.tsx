"use client";

import { NativeDateInput } from "@/app/components/ui/native-date-input";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/app/components/current-user-provider";
import { Button } from "@/app/components/ui/button";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { ApiError, getErrorMessage } from "@/app/lib/backend";
import { dateInputToIsoDateTime, formatDateInputValue, toDateInputValue } from "@/app/lib/formatters/date";
import { formatPackageInstant, localPackageInstantToUtc, packageInstantToLocalInput, packageTrainingKind } from "@/app/lib/package-validity";
import { formatMoney } from "@/app/lib/formatters/money";
import { getPackages, type Package } from "@/app/lib/owner/packages";
import { userMessage } from "@/app/lib/user-messages";
import { calendarDateIsValid, isPeriodPackage, isSessionPackage, periodPackageError, periodRangeLabel, periodStatusLabel } from "@/app/lib/period-packages";
import {
  closeClientPackage, correctClientPackage, deleteClientPackage, getClientBilling,
  getClientPackageManagementPreview, getPackageBlockerLabel, getPackageClosureLabel,
  getPackagePaymentStatusLabel, type ClientPackageBilling, type CloseClientPackagePayload,
  type CorrectClientPackagePayload, type CorrectClientPackageResult, type PackageManagementPreview,
} from "@/app/lib/owner/billing";

type Mode = "overview" | "correct" | "delete" | "close";
const reasonMaxLength = 1000;
const zeroRemainingMessage = "Nie można wyzerować pozostałych wejść aktywnego pakietu. Aby go zakończyć, zamknij pakiet.";
const inputClass = "mt-1.5 w-full min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 py-2.5 text-sm";

export default function PackageManagementModal({ clientId, packageData, onClose, onSaved }: {
  clientId: number; packageData: ClientPackageBilling; onClose: () => void;
  onSaved: (replacementClientPackageId?: number) => Promise<void>;
}) {
  const { user } = useCurrentUser();
  const ownerAccess = user?.role === "owner";
  const [draftBase, setDraftBase] = useState(packageData);
  const [surplusDisposition, setSurplusDisposition] = useState<"ToBalance" | "KeepByStudio">("ToBalance");
  const [preview, setPreview] = useState<PackageManagementPreview | null>(null);
  const [current, setCurrent] = useState(packageData);
  const [balance, setBalance] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Package[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [mode, setMode] = useState<Mode>("overview");
  const [step, setStep] = useState(1);
  const [sessions, setSessions] = useState(String(packageData.totalSessions));
  const [price, setPrice] = useState(String(packageData.totalPrice));
  const [validUntil, setValidUntil] = useState(packageInstantToLocalInput(packageData.validUntil));
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
  const periodBased = isPeriodPackage(current);

  useEffect(() => {
    alive.current = true;
    if (!ownerAccess) return;
    let cancelled = false;
    Promise.all([getClientPackageManagementPreview(clientId, packageData.clientPackageId), getClientBilling(clientId)])
      .then(([data, billing]) => {
        if (cancelled) return;
        const item = billing.packages?.find((item) => item.clientPackageId === packageData.clientPackageId);
        if (!item) throw new Error("Pakiet nie jest już dostępny. Odśwież widok klienta.");
        setCurrent(item); setBalance(billing.currentBalance); setPreview(data);
      }).catch((err) => { if (!cancelled) setError(getErrorMessage(err, "Nie udało się sprawdzić dostępnych działań. Otwórz pakiet ponownie.")); });
    if (!isPeriodPackage(packageData)) getPackages().then((data) => { if (!cancelled) setCatalog(data.filter((item) => item.isActive && isSessionPackage(item))); })
      .catch((err) => { if (!cancelled) setCatalogError(getErrorMessage(err, "Nie udało się pobrać pakietów do wyboru. Otwórz okno ponownie, aby zmienić pakiet.")); });
    return () => { cancelled = true; alive.current = false; };
  }, [clientId, packageData, ownerAccess]);

  async function refreshContext(preserveDraft = false) {
    const [latest, billing] = await Promise.all([getClientPackageManagementPreview(clientId, current.clientPackageId), getClientBilling(clientId)]);
    const updated = billing.packages?.find((item) => item.clientPackageId === current.clientPackageId);
    if (!updated) throw new Error("Pakiet nie jest już dostępny. Odśwież widok klienta.");
    if (alive.current) {
      if (preserveDraft && mode === "correct") {
        setSessions(value => Number(value) === draftBase.totalSessions ? String(updated.totalSessions) : value);
        const base = withPreviewAmounts(updated, latest);
        setPrice(value => Number(value) === draftBase.totalPrice ? String(base.totalPrice) : value);
        setValidUntil(value => value === packageInstantToLocalInput(draftBase.validUntil) ? packageInstantToLocalInput(updated.validUntil) : value);
        setDueDate(value => value === toDateInputValue(draftBase.paymentDueDate) ? toDateInputValue(updated.paymentDueDate) : value);
        setDraftBase(base);
      }
      setPreview(latest); setCurrent(updated); setBalance(billing.currentBalance);
    }
    return { latest, updated };
  }

  async function begin(next: Mode, withReplacement = false) {
    if (!ownerAccess || saving.current) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const { latest, updated } = await refreshContext();
      if (!alive.current) return;
      if (isPeriodPackage(updated) && withReplacement) { setError("Aby zmienić cenę lub daty usługi, zamknij bieżący okres i przypisz nowy."); return; }
      const allowed = next === "correct" ? canEditPackage(latest) : next === "delete" ? latest.canDelete : latest.canClose;
      if (!allowed) { setError(next === "delete" ? getPackageBlockerLabel(latest.deleteBlockReason) : "Ta czynność nie jest już dostępna. Sprawdź aktualne dane i blokady pakietu."); return; }
      setMode(next); setChanged(false); setReason("");
      if (next === "correct") {
        const base = withPreviewAmounts(updated, latest);
        setDraftBase(base); setSurplusDisposition("ToBalance");
        setSessions(String(base.totalSessions)); setPrice(String(base.totalPrice));
        setValidUntil(packageInstantToLocalInput(updated.validUntil)); setDueDate(toDateInputValue(updated.paymentDueDate));
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
    if (periodBased && replace) { setError("Usługę okresową można zamknąć i przypisać ponownie z nowymi warunkami."); return; }
    if (!ownerAccess || !preview || saving.current || changed || mode === "overview") return;
    setError(""); setNotice("");
    const correction: CorrectClientPackagePayload = { expectedVersion: preview.version, reason: reason.trim() };
    let closure: CloseClientPackagePayload | null = null;
    if (mode === "correct") {
      if (!reason.trim()) { setError("Podaj powód zmiany."); return; }
      if (reason.trim().length > reasonMaxLength) { setError(`Powód może mieć maksymalnie ${reasonMaxLength} znaków.`); return; }
      const editFields = preview.canEdit === true || preview.canCorrect === true;
      const sessionsChanged = Number(sessions) !== draftBase.totalSessions;
      const priceChanged = Number(price) !== draftBase.totalPrice;
      const validityChanged = validUntil !== packageInstantToLocalInput(draftBase.validUntil);
      const dueChanged = dueDate !== toDateInputValue(draftBase.paymentDueDate);
      if ((sessionsChanged || validityChanged || dueChanged) && !editFields) { setError("Zmiana liczby wejść i dat jest teraz zablokowana. Formularz został zachowany."); return; }
      if (priceChanged && preview.canCorrectPrice !== true) { setError("Zmiana ceny jest teraz zablokowana. Formularz został zachowany."); return; }
      if (sessionsChanged) {
        if (!sessions.trim() || !Number.isSafeInteger(Number(sessions)) || Number(sessions) < Math.max(current.usedSessions, 0)) { setError("Liczba wejść nie może być niższa od liczby wykorzystanych wejść."); return; }
        if (current.isActive && Number(sessions) === current.usedSessions) { setError(zeroRemainingMessage); return; }
        correction.totalSessions = Number(sessions);
      }
      if (priceChanged) {
        if (!/^\d+(?:\.\d{1,2})?$/.test(price) || !Number.isFinite(Number(price)) || Number(price) < 0) { setError("Podaj poprawną cenę z dokładnością do groszy."); return; }
        correction.totalPrice = Number(price);
        const paid = preview.amountPaid ?? current.amountPaid;
        if (Math.round(Number(price) * 100) < Math.round(paid * 100)) correction.surplusDisposition = surplusDisposition;
      }
      if (validityChanged) {
        const utc = localPackageInstantToUtc(validUntil);
        if (!utc) { setError("Podaj poprawną datę i godzinę ważności."); return; }
        correction.validUntil = utc;
      }
      if (dueChanged) {
        if (!calendarDateIsValid(dueDate)) { setError("Podaj poprawny termin płatności."); return; }
        const utc = dateInputToIsoDateTime(dueDate);
        if (!utc || !Number.isFinite(Date.parse(utc))) { setError("Podaj poprawny termin płatności."); return; }
        correction.paymentDueDate = utc;
      }
      if (Object.keys(correction).length === 2) { setError("Zmień przynajmniej jedną wartość."); return; }
    }
    if (mode === "close") {
      const message = financialError();
      if (message || !debt || !funds) { setError(message); return; }
      if (replace && !replacementCatalog.some((item) => item.id === Number(replacementId))) { setError("Wybierz nowy pakiet."); return; }
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
      if (!alive.current) return;
      const allowed = mode === "correct" ? canEditPackage(latest) : mode === "delete" ? latest.canDelete : latest.canClose;
      if (JSON.stringify(latest.version) !== JSON.stringify(preview.version)) {
        setPreview(null); setChanged(true); await refreshContext(true);
        setError("Dane pakietu zmieniły się. Zachowaliśmy Twój formularz. Sprawdź aktualne dane i ponownie zatwierdź decyzję."); return;
      }
      setPreview(latest);
      if (mode === "correct") {
        const editFields = latest.canEdit === true || latest.canCorrect === true;
        const otherFieldsChanged = correction.totalSessions !== undefined || correction.validUntil !== undefined || correction.paymentDueDate !== undefined;
        if ((otherFieldsChanged && !editFields) || (correction.totalPrice !== undefined && latest.canCorrectPrice !== true)) {
          setChanged(true); setError("Dostępne działania zmieniły się. Formularz został zachowany. Sprawdź aktualne uprawnienia przed ponownym zatwierdzeniem."); return;
        }
      }
      if (!allowed) { setError(mode === "delete" ? getPackageBlockerLabel(latest.deleteBlockReason) : "Ta czynność jest teraz niedostępna. Sprawdź aktualne dane i blokady pakietu."); return; }
      if (mode !== "delete" && (preview.version === undefined || preview.version === null)) { setError("Nie udało się sprawdzić aktualności pakietu. Otwórz okno ponownie."); return; }
      let replacementClientPackageId: number | undefined;
      let correctionResult: CorrectClientPackageResult | undefined;
      mutationStarted = true;
      if (mode === "delete") await deleteClientPackage(clientId, current.clientPackageId);
      else if (mode === "close" && closure) {
        const response = await closeClientPackage(clientId, current.clientPackageId, closure);
        replacementClientPackageId = response.replacementClientPackageId ?? undefined;
      } else correctionResult = await correctClientPackage(clientId, current.clientPackageId, correction) ?? undefined;
      committed = true;
      if (!alive.current) return;
      await onSaved(replacementClientPackageId);
      if (mode === "delete") { onClose(); return; }
      await refreshContext(); setMode("overview"); setChanged(false);
      setNotice(periodBased && mode === "close" ? funds === "Refund" ? "Usługa została zamknięta. Zwrot oczekuje na wykonanie i potwierdzenie." : "Usługa została zamknięta. Rozliczenie znajdziesz w jej szczegółach." : mode === "close" ? funds === "Refund" ? "Pakiet został zamknięty. Zwrot oczekuje na wykonanie i potwierdzenie." : replacementClientPackageId ? "Pakiet został zmieniony. Nowy pakiet oznaczono w widoku klienta." : "Pakiet został zamknięty. Rozliczenie znajdziesz w jego szczegółach." : correctionNotice(correctionResult, current.currency));
    } catch (err) {
      if (!alive.current) return;
      setPreview(null);
      if (committed) { setMode("overview"); setError("Zmiana została zapisana, ale nie udało się odświeżyć wszystkich danych. Zamknij okno i odśwież widok klienta."); }
      else if (err instanceof ApiError && (err.status === 409 || (err.status === 400 && /version|wersj/i.test(err.message)))) {
        setChanged(true); setError("Dane pakietu zmieniły się. Zachowaliśmy Twój formularz. Sprawdź aktualne dane i ponownie zatwierdź decyzję.");
        try { await refreshContext(true); } catch { setError("Nie udało się pobrać aktualnych danych. Formularz został zachowany. Spróbuj odświeżyć dane poniżej."); }
      } else if (mutationStarted && mode === "close" && (!(err instanceof ApiError) || err.status >= 500)) {
        setChanged(true); setError("Nie udało się potwierdzić zapisu. Przed kolejną próbą sprawdź aktualny stan pakietu — zamknięcie mogło już zostać zapisane.");
        try { await Promise.all([refreshContext(), onSaved()]); } catch { setError("Nie udało się sprawdzić wyniku zamknięcia. Formularz został zachowany. Odśwież dane przed dalszym działaniem."); }
      } else {
        setError(err instanceof ApiError && err.status === 400 && err.payload && typeof err.payload === "object" && "message" in err.payload && typeof err.payload.message === "string"
          ? userMessage(err.payload.message, "Nie udało się zapisać zmiany pakietu. Sprawdź wpisane dane.") : periodBased ? periodPackageError(err) : getErrorMessage(err, "Nie udało się zapisać zmiany pakietu."));
        try { await refreshContext(true); } catch { /* Keep actions disabled until fresh data is available. */ }
      }
    } finally { saving.current = false; if (alive.current) setBusy(false); }
  }

  async function retryContext() {
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await refreshContext(true); setError(mode === "overview" ? "" : "Sprawdź aktualne dane przed zatwierdzeniem."); if (mode !== "overview") setChanged(true); }
    catch (err) { setPreview(null); setError(getErrorMessage(err, "Nie udało się pobrać aktualnych danych pakietu.")); }
    finally { saving.current = false; setBusy(false); }
  }

  const canChangeFields = preview?.canEdit === true || preview?.canCorrect === true;
  const canChangePrice = preview?.canCorrectPrice === true;
  const priceChanged = Number(price) !== draftBase.totalPrice;
  const paid = preview?.amountPaid ?? current.amountPaid;
  const validPrice = /^\d+(?:\.\d{1,2})?$/.test(price) && Number.isFinite(Number(price));
  const proposedPrice = priceChanged ? (validPrice ? Number(price) : Number.NaN) : current.totalPrice;
  const surplus = priceChanged && Number.isFinite(proposedPrice) ? Math.max(0, Math.round((paid - proposedPrice) * 100) / 100) : 0;
  const proposedDue = priceChanged ? Math.max(0, proposedPrice - paid) : preview?.amountDue ?? current.amountDue;
  const comparisons = [
    ...(periodBased ? [] : [["Wszystkie wejścia", String(draftBase.totalSessions), sessions]]),
    ["Kwota za pakiet", formatMoney(draftBase.totalPrice, current.currency), price ? formatMoney(Number(price), current.currency) : "Podaj kwotę"],
    ["Ważny do", formatPackageInstant(draftBase.validUntil), validUntil ? formatPackageInstant(localPackageInstantToUtc(validUntil)) : "Brak daty"],
    ["Termin płatności", formatDateInputValue(draftBase.paymentDueDate), formatDateInputValue(dueDate)],
  ];
  const editLabel = preview?.canEdit === true ? periodBased ? "Edytuj usługę" : "Edytuj pakiet" : periodBased ? "Korekta usługi" : "Korekta pakietu";
  const zeroesRemaining = !periodBased && mode === "correct" && current.isActive && sessions.trim() !== "" && Number(sessions) !== draftBase.totalSessions && Number(sessions) === current.usedSessions;
  const closeAllowed = Boolean(preview?.canClose);
  const replacementCatalog = catalog.filter(item => {
    if (!isSessionPackage(item) || periodBased) return false;
    const currentKind = packageTrainingKind(current.packageType, current.expectedBillingType);
    const sameLocation = currentKind !== "group" || (current.locationId != null && (item.locationId === current.locationId || item.locationIds?.includes(current.locationId) === true));
    return currentKind !== "unknown" && packageTrainingKind(item.packageType, item.billingType) === currentKind && sameLocation;
  });
  if (!ownerAccess) return null;
  return <ModalOverlay onClose={busy ? undefined : onClose}>
    <section role="dialog" aria-modal="true" aria-label={periodBased ? "Zarządzanie usługą" : "Zarządzanie pakietem"} className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 md:p-6">
      <ModalHeader title={mode === "correct" ? editLabel : periodBased ? mode === "close" ? "Zamknij usługę" : "Zarządzaj usługą" : mode === "delete" ? "Usuń pakiet" : mode === "close" ? replace ? "Zmień pakiet" : "Zamknij pakiet" : "Zarządzaj pakietem"} description={current.packageName || "Pakiet klienta"} onClose={() => { if (!busy) onClose(); }} />
      {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 text-sm text-tertiary-light">{notice}</p> : null}
      {!preview && !error ? <p className="mt-4" role="status">Sprawdzanie dostępnych działań…</p> : null}
      {!preview && error ? <Button className="mt-3" variant="secondary" disabled={busy} onClick={() => void retryContext()}>Odśwież dane pakietu</Button> : null}
      {preview ? <div className="mt-4 space-y-2 text-sm text-on-surface-variant">{(preview.blockers || []).map((blocker, index) => <p key={index}>{getPackageBlockerLabel(blocker)}</p>)}</div> : null}
      {mode === "overview" && preview ? <div className="mt-5 space-y-3">
        <PackageSummary packageData={current} amountDue={preview.amountDue} remaining={preview.remainingSessions} balance={balance} />
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy || !canEditPackage(preview)} onClick={() => void begin("correct")}>{editLabel}</Button>
          {preview.canClose ? <><Button disabled={busy} variant="secondary" onClick={() => void begin("close")}>{periodBased ? "Zamknij usługę" : "Zamknij pakiet"}</Button>{!periodBased ? <Button disabled={busy} variant="secondary" onClick={() => void begin("close", true)}>Zmień pakiet</Button> : null}</> : null}
          {preview.canDelete ? <Button disabled={busy} variant="danger" onClick={() => void begin("delete")}>Usuń</Button> : null}
        </div>
        {!canEditPackage(preview) && !(preview.blockers || []).length ? <p className="text-xs text-on-surface-muted">Edycja tego pakietu jest obecnie niedostępna.</p> : null}
        {!preview.canDelete && preview.deleteBlockReason ? <p className="text-sm">{getPackageBlockerLabel(preview.deleteBlockReason)}</p> : null}
      </div> : null}
      {mode === "correct" ? <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {!periodBased ? <label className="text-sm">Wszystkie wejścia<input className={inputClass} type="number" disabled={!canChangeFields} min={current.usedSessions} step="1" required value={sessions} onChange={(event) => setSessions(event.target.value)} /></label> : null}
          <label className="text-sm">Kwota za pakiet ({current.currency || "PLN"})<input className={inputClass} type="number" disabled={!canChangePrice} min="0" step="0.01" required aria-describedby="package-price-hint" value={price} onChange={(event) => setPrice(event.target.value)} /><span id="package-price-hint" className="mt-1 block text-xs text-on-surface-muted">Należność klienta za ten pakiet po uwzględnieniu salda, a nie cena z katalogu.</span></label>
          <label className="text-sm">Ważny do — data i godzina<NativeDateInput className={inputClass} type="datetime-local" disabled={!canChangeFields} required={Boolean(current.validUntil)} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label>
          <label className="text-sm">Termin płatności<NativeDateInput className={inputClass} type="date" disabled={!canChangeFields} required={Boolean(current.paymentDueDate)} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        </fieldset>
        <p className="text-xs text-on-surface-muted">Ważność kończy się o wskazanej godzinie w Twojej lokalnej strefie czasowej. Korekta nie usuwa wcześniej ustawionych dat.</p>
        {!canChangeFields && canChangePrice ? <p className="text-sm text-on-surface-muted">Możesz zmienić kwotę za pakiet. {periodBased ? "Daty pozostają" : "Liczba wejść i daty pozostają"} zablokowane.</p> : null}
        {zeroesRemaining ? <div role="alert" className="space-y-2 rounded-lg bg-surface-container-lowest p-3 text-sm"><p className="text-error-light">{zeroRemainingMessage}</p>{preview?.canClose ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void begin("close")}>Przejdź do zamknięcia pakietu</Button> : null}</div> : null}
        {surplus > 0 ? <fieldset disabled={busy} className="space-y-3 rounded-lg bg-surface-container-lowest p-4"><legend className="px-1 font-semibold">Co zrobić z nadwyżką?</legend>
          <Decision checked={surplusDisposition === "ToBalance"} name="surplus" onChange={() => setSurplusDisposition("ToBalance")} label="Przenieś na saldo klienta" description="Klient wykorzysta nadwyżkę przy kolejnych płatnościach." />
          <Decision checked={surplusDisposition === "KeepByStudio"} name="surplus" onChange={() => setSurplusDisposition("KeepByStudio")} label="Pozostaw w studiu" description="Nadwyżka pozostanie w studiu i nie zwiększy salda klienta." />
        </fieldset> : null}
        <div className="rounded-lg bg-surface-container-lowest p-3 text-sm"><p>Do zapłaty było {formatMoney(preview?.amountDue ?? current.amountDue, current.currency)}, będzie {Number.isFinite(proposedDue) ? formatMoney(proposedDue, current.currency) : "Podaj cenę"}.</p>{surplus > 0 ? <p className="mt-2">{formatMoney(surplus, current.currency)} → {surplusDisposition === "ToBalance" ? "saldo klienta" : "zostaje w studiu"}</p> : null}</div>
        <label className="block text-sm">Powód zmiany<textarea className={inputClass} required disabled={busy} maxLength={reasonMaxLength} aria-describedby="package-reason-count" value={reason} onChange={(event) => setReason(event.target.value)} /><span id="package-reason-count" className="mt-1 block text-right text-xs text-on-surface-muted">{reason.length} / {reasonMaxLength}</span></label>
        <div className="space-y-2 rounded-lg bg-surface-container-lowest p-3 text-sm"><p className="font-semibold">Przed → Po</p>{comparisons.map(([label, before, after]) => <p key={label} className="break-words">{label}: {before || "Brak daty"} → {after || "Brak daty"}</p>)}</div>
        {changed && preview ? <Button type="button" variant="secondary" disabled={busy} onClick={() => { setChanged(false); setError(""); }}>Sprawdziłem aktualne dane</Button> : null}
        <div className="flex flex-wrap gap-3"><Button type="button" variant="ghost" disabled={busy} onClick={() => setMode("overview")}>Wróć</Button><Button type="submit" disabled={busy || changed || zeroesRemaining || !preview || !canEditPackage(preview)}>{busy ? "Zapisywanie…" : "Zapisz zmiany"}</Button></div>
      </form> : null}
      {mode === "close" ? <div className="mt-5 space-y-4">
        <p className="text-label text-primary-light">Krok {step} z 3</p>
        {step === 1 ? <><PackageSummary packageData={current} amountDue={preview?.amountDue} remaining={preview?.remainingSessions} balance={balance} /><p className="text-sm text-on-surface-muted">{periodBased ? "Historia usługi pozostaje dostępna. W kolejnym kroku zdecydujesz o jej rozliczeniu." : "Zamknięcie zachowuje historię pakietu. W kolejnym kroku zdecydujesz o jego rozliczeniu."}</p><div className="flex flex-wrap gap-3"><Button disabled={busy} variant="ghost" onClick={() => setMode("overview")}>Wróć</Button><Button disabled={busy || !closeAllowed} onClick={() => setStep(2)}>Przejdź do rozliczenia</Button></div></> : null}
        {step === 2 ? <>
          <label className="block text-sm">{periodBased ? "Powód zamknięcia usługi" : "Powód zamknięcia lub zmiany"}<textarea className={inputClass} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
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
          <div className="flex flex-wrap gap-3"><Button disabled={busy} variant="ghost" onClick={() => setStep(1)}>Wróć</Button><Button disabled={busy || !closeAllowed} onClick={() => { const message = financialError(); setError(message); if (!message) setStep(3); }}>{periodBased ? "Przejdź do podsumowania" : "Przejdź do wyboru pakietu"}</Button></div>
        </> : null}
        {step === 3 ? <>
          {!periodBased ? <label className="flex items-center gap-3 text-sm"><input type="checkbox" disabled={busy} checked={replace} onChange={(event) => setReplace(event.target.checked)} />Przypisz nowy pakiet przy zamknięciu</label> : <p className="text-sm text-on-surface-muted">Po zamknięciu możesz osobno przypisać nowy okres usługi.</p>}
          {replace ? <><label className="block text-sm">Nowy pakiet<select className={inputClass} disabled={busy} value={replacementId} onChange={(event) => setReplacementId(event.target.value)}><option value="">Wybierz pakiet</option>{replacementCatalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.price, item.currency)}{item.locationName ? ` · ${item.locationName}` : ""}</option>)}</select></label>{catalogError ? <p role="alert" className="text-sm text-error-light">{catalogError}</p> : !replacementCatalog.length ? <p className="text-sm text-on-surface-muted">Brak dostępnych pakietów do wyboru.</p> : null}<p className="text-sm text-on-surface-muted">Zamknięcie i przypisanie nowego pakietu zostaną zapisane razem.</p></> : null}
          <div className="space-y-2 rounded-lg bg-surface-container-lowest p-4 text-sm"><p className="font-semibold">Twoja decyzja</p><p className="break-words">Powód: {reason}</p><p>{debt === "KeepDue" ? "Należność pozostaje do zapłaty." : "Pozostała należność zostanie umorzona."}</p><p>{funds === "KeepFunds" ? "Wpłacone środki pozostają w pakiecie." : funds === "Balance" ? `Na saldo: ${formatMoney(Number(settlement), current.currency)}` : `Zwrot oczekujący: ${formatMoney(Number(settlement), current.currency)}`}</p>{replace ? <p>Nowy pakiet: {replacementCatalog.find((item) => item.id === Number(replacementId))?.name || "Wybierz pakiet"}</p> : null}</div>
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
  const periodBased = isPeriodPackage(packageData);
  const fields = [
    ...(periodBased ? [["Okres usługi", periodRangeLabel(packageData.periodStartsAt, packageData.validUntil)], ["Status okresu", periodStatusLabel(packageData.periodStatus)]] : [
      ["Ważny do", formatPackageInstant(packageData.validUntil)],
      ["Wykorzystane wejścia", `${packageData.usedSessions} / ${packageData.totalSessions}`],
      ["Pozostałe wejścia", remaining === undefined ? "Niedostępne" : String(remaining)],
    ]),
    ["Opłacono", formatMoney(packageData.amountPaid, packageData.currency)],
    ["Do zapłaty", amountDue === undefined ? "Niedostępne" : formatMoney(amountDue, packageData.currency)],
    ["Saldo do wykorzystania", balance === null ? "Niedostępne" : formatMoney(balance, packageData.currency)],
    ["Płatność", getPackagePaymentStatusLabel(packageData.paymentStatus)],
    ["Zamknięcie", getPackageClosureLabel(packageData.closureDisposition)],
  ];
  return <dl className="grid min-w-0 grid-cols-1 gap-3 rounded-lg bg-surface-container-lowest p-4 text-sm sm:grid-cols-2">{fields.filter(([, value]) => value !== null).map(([label, value]) => <div key={label}><dt className="text-on-surface-muted">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}</dl>;
}


function canEditPackage(preview: PackageManagementPreview) {
  return preview.canEdit === true || preview.canCorrect === true || preview.canCorrectPrice === true;
}

function withPreviewAmounts(item: ClientPackageBilling, preview: PackageManagementPreview): ClientPackageBilling {
  return {
    ...item,
    totalPrice: typeof preview.totalPrice === "number" ? preview.totalPrice : item.totalPrice,
    amountPaid: typeof preview.amountPaid === "number" ? preview.amountPaid : item.amountPaid,
  };
}

function correctionNotice(result: CorrectClientPackageResult | undefined, currency: string | null) {
  const parts = ["Korekta została zapisana."];
  if (typeof result?.amountDue === "number") parts.push(`Do zapłaty: ${formatMoney(result.amountDue, currency)}.`);
  if (typeof result?.surplus === "number" && result.surplus > 0) {
    const surplus = formatMoney(result.surplus, currency);
    parts.push(result.surplusDisposition === "KeepByStudio" ? `Nadwyżka ${surplus} zostaje w studiu.`
      : result.surplusDisposition === "ToBalance" ? `Nadwyżka ${surplus} trafiła na saldo klienta.` : `Nadwyżka: ${surplus}.`);
  }
  return parts.join(" ");
}
