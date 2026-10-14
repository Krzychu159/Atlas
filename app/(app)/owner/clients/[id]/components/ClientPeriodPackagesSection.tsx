"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { NativeDateInput } from "@/app/components/ui/native-date-input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { getPackages, type Package } from "@/app/lib/owner/packages";
import { createClientPackage, getClientPeriodPackages, getPackageClosureLabel, getPackagePaymentStatusLabel, setClientPeriodRenewal, type ClientPackageBilling, type PagedResult } from "@/app/lib/owner/billing";
import { canChangePeriodRenewal, calendarDateIsValid, formatPeriodAmount, isPeriodPackage, periodPackageError, periodRangeLabel, periodStatusLabel, warsawCalendarDate } from "@/app/lib/period-packages";
import { dateInputToIsoDateTime } from "@/app/lib/formatters/date";
import { useClientPaymentRevision } from "@/app/lib/session-corrections";
import PackageManagementModal from "./PackageManagementModal";

export default function ClientPeriodPackagesSection({ clientId, canManage = false, packages, onSaved, onPayment, portal = "owner", embedded = false }: {
  clientId: number; canManage?: boolean; packages?: ClientPackageBilling[] | null; portal?: "owner" | "trainer" | "client"; embedded?: boolean;
  onSaved?: () => Promise<void>; onPayment?: (item: ClientPackageBilling) => void;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<ClientPackageBilling> | null>(null);
  const [loading, setLoading] = useState(portal === "owner");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [offers, setOffers] = useState<Package[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState("");
  const [offerId, setOfferId] = useState("");
  const [startsOn, setStartsOn] = useState(() => warsawCalendarDate(new Date()) || "");
  const [autoRenew, setAutoRenew] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [today, setToday] = useState(() => warsawCalendarDate(new Date()) || "");
  const [busy, setBusy] = useState(false);
  const [managed, setManaged] = useState<ClientPackageBilling | null>(null);
  const [renewal, setRenewal] = useState<{ item: ClientPackageBilling; enabled: boolean } | null>(null);
  const lock = useRef(false);
  const paymentRevision = useClientPaymentRevision(clientId);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (portal !== "owner") return;
    setLoading(true); setLoadError("");
    try {
      const result = await getClientPeriodPackages(clientId, page, signal);
      if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(result.totalPages) || result.totalPages < 0 || !Number.isSafeInteger(result.totalCount) || result.totalCount < 0 || !Number.isSafeInteger(result.page) || result.page < 1 || !Number.isSafeInteger(result.pageSize) || result.pageSize < 1) throw new Error("Lista usług jest niedostępna. Odśwież dane.");
      if (result.items.some(item => !isPeriodPackage(item))) throw new Error("Nie udało się sprawdzić rodzaju usług. Odśwież dane przed dalszym działaniem.");
      if (!signal?.aborted) {
        if (page > Math.max(result.totalPages, 1)) { setPage(Math.max(result.totalPages, 1)); return; }
        setData(result);
        setToday(warsawCalendarDate(new Date()) || "");
      }
    } catch (err) { if (!signal?.aborted) { setData(null); setLoadError(periodPackageError(err)); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [clientId, page, portal]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); });
    return () => controller.abort();
  }, [load, revision, paymentRevision]);

  useEffect(() => {
    if (!assignOpen || !canManage || portal !== "owner") return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setOffersLoading(true); setOffersError(""); setOffers([]);
      try {
        const result = await getPackages({ isActive: true }, controller.signal);
        if (!controller.signal.aborted) setOffers(result.filter(item => item.isActive && isPeriodPackage(item)));
      } catch (err) { if (!controller.signal.aborted) setOffersError(periodPackageError(err)); }
      finally { if (!controller.signal.aborted) setOffersLoading(false); }
    });
    return () => controller.abort();
  }, [assignOpen, canManage, portal, revision]);

  async function refreshAfterSave() {
    setRevision(value => value + 1);
    await onSaved?.();
  }

  async function assign() {
    if (lock.current || !canManage || portal !== "owner") return;
    const offer = offers.find(item => item.id === Number(offerId));
    if (!offer || !offer.isActive || !isPeriodPackage(offer)) { setError("Wybierz dostępną ofertę usługi okresowej."); return; }
    if (!calendarDateIsValid(startsOn)) { setError("Wybierz poprawną datę rozpoczęcia."); return; }
    if (dueDate && !calendarDateIsValid(dueDate)) { setError("Wybierz poprawny termin płatności."); return; }
    lock.current = true; setBusy(true); setError(""); setNotice("");
    let committed = false;
    try {
      await createClientPackage({ clientId, packageId: offer.id, startsOn, autoRenew, ...(dueDate ? { paymentDueDate: dateInputToIsoDateTime(dueDate)! } : {}) });
      committed = true; setAssignOpen(false); setPage(1);
      setNotice("Usługa została przypisana klientowi. Sprawdź jej okres i rozliczenie poniżej.");
      await refreshAfterSave();
    } catch (err) {
      setError(committed ? "Usługa została przypisana, ale nie udało się odświeżyć wszystkich danych. Odśwież widok przed dalszym działaniem." : periodPackageError(err));
      setOfferId(""); setRevision(value => value + 1);
      if (!committed) { try { await onSaved?.(); } catch { /* Do not retry the assignment. */ } }
    } finally { lock.current = false; setBusy(false); }
  }

  async function saveRenewal() {
    if (lock.current || !renewal || !canManage || portal !== "owner") return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    let committed = false;
    try {
      const latest = await getClientPeriodPackages(clientId, page);
      const item = latest.items?.find(item => item.clientPackageId === renewal.item.clientPackageId);
      if (!item || !canChangePeriodRenewal(item, warsawCalendarDate(new Date()))) throw new Error("Nie można zmienić odnawiania tego okresu. Odśwież dane.");
      if (item.periodAutoRenewEnabled !== renewal.item.periodAutoRenewEnabled) {
        setData(latest); setRenewal({ ...renewal, item }); setError("Ustawienie odnawiania zmieniło się. Sprawdź aktualną wartość i ponownie zatwierdź decyzję."); return;
      }
      if (item.periodAutoRenewEnabled === renewal.enabled) { setRenewal(null); setRevision(value => value + 1); return; }
      await setClientPeriodRenewal(clientId, item.clientPackageId, renewal.enabled);
      committed = true; setRenewal(null);
      setNotice(renewal.enabled ? "Automatyczne odnawianie zostało włączone. Kolejne okresy mogą wymagać opłacenia." : "Automatyczne odnawianie zostało wyłączone. Bieżący okres pozostaje bez zmian.");
      await refreshAfterSave();
    } catch (err) {
      setRenewal(null); setRevision(value => value + 1);
      setError(committed ? "Ustawienie zostało zapisane, ale nie udało się odświeżyć wszystkich danych. Odśwież widok." : periodPackageError(err));
      if (!committed) { try { await onSaved?.(); } catch { /* Require another explicit decision after refresh. */ } }
    } finally { lock.current = false; setBusy(false); }
  }

  const items = portal === "owner" ? data?.items || [] : (packages || []).filter(isPeriodPackage);
  const selectedOffer = offers.find(item => item.id === Number(offerId));
  const pastStart = Boolean(today && startsOn < today);
  const renewalStart = renewal?.item.periodStartsAt ? warsawCalendarDate(renewal.item.periodStartsAt) : null;
  const catchUp = renewal?.enabled && renewalStart && today && renewalStart < today;

  return <section className={embedded ? "min-w-0" : "card-shell min-w-0 p-5 md:p-6"} aria-label="Usługi okresowe">
    <div className={`flex flex-wrap items-center gap-3 ${embedded ? "justify-end" : "justify-between"}`}>{embedded ? null : <h2 className="text-section-title">Usługi okresowe</h2>}<div className="flex flex-wrap gap-2">{portal === "owner" ? <Button type="button" size="sm" variant="secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Odśwież</Button> : null}{canManage && portal === "owner" ? <Button type="button" size="sm" disabled={busy} onClick={() => { setOfferId(""); setStartsOn(warsawCalendarDate(new Date()) || ""); setAutoRenew(false); setDueDate(""); setError(""); setAssignOpen(true); }}>Przypisz usługę</Button> : null}</div></div>
    {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
    {loadError ? <p role="alert" className="mt-4 text-sm text-error-light">{loadError}</p> : null}
    {notice ? <p role="status" className="mt-4 text-sm text-tertiary-light">{notice}</p> : null}
    {loading ? <p role="status" className="mt-4 text-sm">Ładowanie usług…</p> : !loadError || items.length ? items.length ? <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={item.clientPackageId} className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest p-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-semibold">{item.packageName || "Usługa bez nazwy"}</h3><span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-info-light">{periodStatusLabel(item.periodStatus)}</span></div>
      <p className="mt-1.5 font-semibold text-on-surface-variant">{periodRangeLabel(item.periodStartsAt, item.validUntil)}</p>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2"><Detail label="Cena okresu" value={formatPeriodAmount(item.totalPrice, item.currency)} /><Detail label="Płatność" value={getPackagePaymentStatusLabel(item.paymentStatus)} /><Detail label="Pozostało do zapłaty" value={formatPeriodAmount(item.amountDue, item.currency)} /><Detail label="Automatyczne odnawianie" value={item.periodAutoRenewEnabled === true ? "Włączone" : item.periodAutoRenewEnabled === false ? "Wyłączone" : "Nie podano"} /><Detail label="Lokalizacja" value={item.locationName || "Nie podano"} />{getPackageClosureLabel(item.closureDisposition) ? <Detail label="Rozliczenie zamknięcia" value={getPackageClosureLabel(item.closureDisposition)!} /> : null}{item.refundAmount > 0 ? <Detail label="Kwota zwrotu" value={formatPeriodAmount(item.refundAmount, item.currency)} /> : null}</dl>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.amountDue > 0 && (portal !== "client" || onPayment) ? onPayment ? <Button type="button" size="sm" disabled={busy} onClick={() => onPayment(item)}>{portal === "client" ? "Zgłoś wpłatę" : "Dodaj wpłatę"}</Button> : <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-light" href={`/${portal}/clients/${clientId}/payments?clientPackageId=${item.clientPackageId}&addPayment=1`}>Dodaj wpłatę</Link> : null}
        {canManage && portal === "owner" ? <><label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" aria-label={`Automatyczne odnawianie: ${item.packageName || "usługa"}`} checked={item.periodAutoRenewEnabled === true} disabled={busy || loading || item.periodAutoRenewEnabled == null || !canChangePeriodRenewal(item, today)} onChange={event => { setError(""); setRenewal({ item, enabled: event.target.checked }); }} />Odnawianie</label><Button type="button" size="sm" variant="secondary" disabled={busy || loading} onClick={() => setManaged(item)}>Zarządzaj usługą</Button></> : null}
      </div>
    </article>)}</div> : <p className="mt-4 text-sm text-on-surface-muted">Brak usług okresowych.</p> : null}
    {portal === "owner" && data ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-muted"><span>{data.totalCount} usług · Strona {data.page} z {Math.max(data.totalPages, 1)}</span><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" disabled={busy || loading || page <= 1} onClick={() => setPage(value => value - 1)}>Poprzednia</Button><Button type="button" size="sm" variant="secondary" disabled={busy || loading || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Następna</Button></div></div> : null}
    {assignOpen ? <ModalOverlay onClose={busy ? undefined : () => setAssignOpen(false)}><section role="dialog" aria-modal="true" aria-label="Przypisz usługę okresową" className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-high"><div className="min-h-0 space-y-4 overflow-y-auto p-5"><ModalHeader title="Przypisz usługę okresową" onClose={() => { if (!busy) setAssignOpen(false); }} />{error ? <p role="alert" className="text-sm text-error-light">{error}</p> : null}{offersError ? <p role="alert" className="text-sm text-error-light">{offersError}</p> : null}<fieldset disabled={busy || offersLoading} className="space-y-4"><CustomSelect label="Oferta usługi" value={offerId} onChange={setOfferId} options={[{ value: "", label: offersLoading ? "Ładowanie ofert…" : "Wybierz usługę" }, ...offers.map(item => ({ value: String(item.id), label: `${item.name} · ${formatPeriodAmount(item.price, item.currency)} · ${item.durationDays} dni${item.locationName ? ` · ${item.locationName}` : ""}` }))]} /><label className="block text-sm">Data rozpoczęcia<NativeDateInput type="date" className="mt-2 w-full rounded-lg bg-surface-container-lowest p-3" value={startsOn} onChange={event => setStartsOn(event.target.value)} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoRenew} onChange={event => setAutoRenew(event.target.checked)} />Automatycznie odnawiaj usługę</label><label className="block text-sm">Termin płatności (opcjonalnie)<NativeDateInput type="date" className="mt-2 w-full rounded-lg bg-surface-container-lowest p-3" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label></fieldset>{selectedOffer ? <p className="text-sm">Cena okresu: <strong>{formatPeriodAmount(selectedOffer.price, selectedOffer.currency)}</strong> · {selectedOffer.durationDays} dni</p> : null}<p className="text-xs leading-5 text-on-surface-muted">Płatność nie zmienia okresu usługi. Odnawianie może tworzyć kolejne należności i nie pobiera automatycznie pieniędzy.</p>{autoRenew && pastStart ? <p role="alert" className="text-sm text-warning-light">Data rozpoczęcia jest w przeszłości. Odnawianie może utworzyć zaległe okresy i należności. Sprawdź datę przed przypisaniem.</p> : null}{!offersLoading && !offersError && !offers.length ? <p className="text-sm">Brak aktywnych ofert usług okresowych.</p> : null}</div><ModalFooter><Button type="button" variant="secondary" disabled={busy} onClick={() => setAssignOpen(false)}>Zamknij</Button><Button type="button" disabled={busy || offersLoading || Boolean(offersError) || !selectedOffer || !calendarDateIsValid(startsOn)} onClick={() => void assign()}>{busy ? "Zapisywanie…" : "Przypisz usługę"}</Button></ModalFooter></section></ModalOverlay> : null}
    {renewal ? <ModalOverlay onClose={busy ? undefined : () => setRenewal(null)}><section role="dialog" aria-modal="true" aria-label="Automatyczne odnawianie usługi" className="relative w-full max-w-lg rounded-[var(--radius-xl)] bg-surface-container-high p-5"><ModalHeader title={renewal.enabled ? "Włącz odnawianie" : "Wyłącz odnawianie"} description={renewal.item.packageName || "Usługa okresowa"} onClose={() => { if (!busy) setRenewal(null); }} /><p className="mt-4 text-sm">Aktualne ustawienie: {renewal.item.periodAutoRenewEnabled ? "włączone" : "wyłączone"}.</p><p className="mt-3 text-sm">{renewal.enabled ? "Kolejne okresy mogą wymagać opłacenia. Odnawianie nie pobiera automatycznie pieniędzy." : "Wyłączenie odnawiania nie skróci bieżącego okresu."}</p>{catchUp ? <p role="alert" className="mt-3 text-sm text-warning-light">Usługa rozpoczęła się wcześniej. Włączenie odnawiania może utworzyć zaległe okresy i należności. Sprawdź rozliczenie przed zatwierdzeniem.</p> : null}{error ? <p role="alert" className="mt-3 text-sm text-error-light">{error}</p> : null}<ModalFooter><Button type="button" variant="secondary" disabled={busy} onClick={() => setRenewal(null)}>Wróć</Button><Button type="button" disabled={busy} onClick={() => void saveRenewal()}>{busy ? "Zapisywanie…" : "Zatwierdź zmianę"}</Button></ModalFooter></section></ModalOverlay> : null}
    {managed && canManage && portal === "owner" ? <PackageManagementModal key={managed.clientPackageId} clientId={clientId} packageData={managed} onClose={() => setManaged(null)} onSaved={refreshAfterSave} /> : null}
  </section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-on-surface-muted">{label}</dt><dd className="break-words">{value}</dd></div>;
}
