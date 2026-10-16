"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { createStaffPaymentIntent } from "@/app/lib/owner/staff-payment-intent";
import { Plus, RefreshCw, Users } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { OrganizationPortalScope } from "@/app/components/organization-theme";
import SessionAccordion from "@/app/components/schedule/SessionAccordion";
import { PaymentEntryModal } from "@/app/components/payments/PaymentEntryModal";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { getClientBilling, getPackagePaymentStatusLabel, confirmClientPayment, paymentMethodOptions, type PaymentMethod, type ClientPayment, type ClientBillingSummary, type PagedResult } from "@/app/lib/owner/billing";
import { prepareGroupEnrollment, type PrepareGroupEnrollmentPayload, confirmGroupEnrollment, getGroupEnrollment, getGroupEnrollments, groupPackageValidityLabel, groupEnrollmentError, groupEnrollmentStatus, type GroupEnrollment } from "@/app/lib/owner/group-enrollments";
import { attendanceLabel, groupSeatsLabel, isCancelledParticipant, type GroupSessionFields } from "@/app/lib/group-sessions";
import { formatMoney } from "@/app/lib/formatters/money";
import { isPaymentPending } from "@/app/lib/payments/display";
import { notifySessionCorrected, notifyClientPaymentChanged, useClientPaymentRevision } from "@/app/lib/session-corrections";
import GroupEnrollmentDraft from "./GroupEnrollmentDraft";

type GroupSession = GroupSessionFields & {
  id: number; title: string | null; startAt: string; status: string | null;
  locationId: number | null; locationName: string | null;
  participants: { clientId: number; clientFullName: string | null; attendanceStatus: string | null; packageName: string | null }[] | null;
};

export default function GroupEnrollmentsSection({ session, canConfirm, onChanged, onBusyChange }: {
  session: GroupSession; canConfirm: boolean; onChanged?: () => Promise<void>; onBusyChange: (busy: boolean) => void;
}) {
  const paymentRevision = useClientPaymentRevision();
  const [page, setPage] = useState(1);
  const [draftOpen, setDraftOpen] = useState(false);
  const [data, setData] = useState<PagedResult<GroupEnrollment> | null>(null);
  const [recent, setRecent] = useState<GroupEnrollment | null>(null);
  const [billingError, setBillingError] = useState("");
  const [billing, setBilling] = useState<Record<number, ClientBillingSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [paymentItem, setPaymentItem] = useState<GroupEnrollment | null>(null);
  const [paymentToConfirm, setPaymentToConfirm] = useState<ClientPayment | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("3");
  const [note, setNote] = useState("");
  const lock = useRef(false);
  const paymentIntent = useRef<ReturnType<typeof createStaffPaymentIntent> | null>(null);
  const [paymentUnresolved, setPaymentUnresolved] = useState(false);
  const alive = useRef(true);
  const prepared = useRef<GroupEnrollment | null>(null);
  const observedPaymentRevision = useRef(0);
  const changed = useRef(onChanged);
  useEffect(() => { changed.current = onChanged; }, [onChanged]);
  const [labels, setLabels] = useState<Record<number, { clientName: string; packageName: string }>>({});
  const sessionId = session.id;
  const closed = ["completed", "cancelled"].includes((session.status || "").toLowerCase());
  const full = session.isFullyBooked === true || session.availableSeats === 0;
  const hasSession = Number.isSafeInteger(sessionId) && sessionId > 0;
  const hasLocation = Number.isSafeInteger(session.locationId) && Number(session.locationId) > 0;
  const editable = canConfirm && !closed;
  const canAdd = editable && hasSession && hasLocation && !full;
  const loadKey = `${sessionId}:${page}:${paymentRevision}:${revision}:${session.startAt}`;
  const [previousLoadKey, setPreviousLoadKey] = useState(loadKey);
  if (previousLoadKey !== loadKey) {
    setPreviousLoadKey(loadKey); setLoading(true); setError(""); setBillingError("");
  }

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { onBusyChange(busy || paymentItem !== null || paymentToConfirm !== null); }, [busy, paymentItem, paymentToConfirm, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  const load = useCallback(async (signal: AbortSignal) => {
    const request = Number.isSafeInteger(sessionId) && sessionId > 0 ? getGroupEnrollments(sessionId, page, signal) : Promise.reject(new Error("Otwórz zajęcia ponownie, aby sprawdzić zgłoszenia."));
    return request.then(async result => {
      if (!result || (result.items !== null && !Array.isArray(result.items)) || !Number.isSafeInteger(result.page) || result.page < 1 || !Number.isSafeInteger(result.pageSize) || result.pageSize < 1 || !Number.isSafeInteger(result.totalPages) || result.totalPages < 0 || !Number.isSafeInteger(result.totalCount) || result.totalCount < 0) throw new Error("Nie udało się pobrać zgłoszeń.");
      if (signal.aborted) return;
      const rows = result.items || [];
      if (paymentRevision !== observedPaymentRevision.current) setBilling({});
      observedPaymentRevision.current = paymentRevision;
      setData(result);
      if (prepared.current) { const latest = rows.find(item => item.id === prepared.current?.id); if (latest) { prepared.current = latest; setRecent(latest); } }
    }).catch(err => { if (!signal.aborted) { setData(null); setBilling({}); setError(groupEnrollmentError(err)); } }).finally(() => { if (!signal.aborted) setLoading(false); });
  }, [sessionId, page, paymentRevision]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, revision, paymentRevision, session.startAt]);
  useEffect(() => {
    if (!paymentRevision) return;
    void changed.current?.().catch(() => { if (alive.current) setActionError("Nie udało się odświeżyć uczestników."); });
  }, [paymentRevision]);
  useEffect(() => {
    const refresh = () => { if (!lock.current) { setRevision(value => value + 1); void changed.current?.().catch(() => {}); } };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  async function refreshSession() {
    try { await changed.current?.(); }
    catch { if (alive.current) setActionError("Nie udało się odświeżyć uczestników. Spróbuj ponownie."); }
  }
  async function prepare(payload: PrepareGroupEnrollmentPayload, names?: { clientName: string; packageName: string }) {
    if (lock.current || !canAdd) throw new Error(full ? "Brak wolnych miejsc." : "Nie można teraz dodać uczestnika.");
    lock.current = true; setBusy(true); setActionError(""); setNotice("");
    try {
      const result = await prepareGroupEnrollment(sessionId, payload);
      prepared.current = result;
      if (names) setLabels(current => ({ ...current, [result.id]: names }));
      if (alive.current) {
        setRecent(result); setDraftOpen(false); setPage(1);
        setNotice(result.status === "ReadyToBook" ? "Zgłoszenie jest gotowe. Potwierdź udział poniżej." : groupEnrollmentStatus(result.status));
      }
      await refreshSession();
    } catch (err) { await refreshSession(); throw err; }
    finally { lock.current = false; if (alive.current) { setBusy(false); setRevision(value => value + 1); } }
  }
  async function confirm(item: GroupEnrollment) {
    if (lock.current || !editable || !hasSession || full || item.clientIsArchived === true || !item.allowedActions?.includes("Confirm")) return;
    lock.current = true; setBusy(true); setActionError(""); setNotice("");
    try {
      const latest = await getGroupEnrollment(item.id);
      if (latest.sessionId !== sessionId || latest.clientId !== item.clientId || latest.clientPackageId !== item.clientPackageId) throw new Error("Zgłoszenie zmieniło się. Sprawdź je ponownie.");
      if (latest.status !== "ReadyToBook") throw new Error(latest.status === "Booked" ? "Uczestnik jest już zapisany." : "Zgłoszenie nie jest jeszcze gotowe do potwierdzenia.");
      const result = await confirmGroupEnrollment(item.id);
      if (prepared.current?.id === result.id) prepared.current = result;
      if (alive.current) { if (recent?.id === result.id) setRecent(result); setData(current => current ? { ...current, items: current.items?.map(row => row.id === result.id ? result : row) || [] } : current); setNotice(result.status === "Booked" ? "Udział został potwierdzony." : groupEnrollmentStatus(result.status)); }
      notifySessionCorrected();
    } catch (err) { if (alive.current) setActionError(groupEnrollmentError(err)); }
    finally { await refreshSession(); lock.current = false; if (alive.current) { setBusy(false); setRevision(value => value + 1); } }
  }
  async function loadPaymentContext(item: GroupEnrollment, openForm: boolean) {
    if (lock.current || !editable || item.clientIsArchived === true) return;
    lock.current = true; setBusy(true); setBillingError("");
    try {
      const snapshot = await getClientBilling(item.clientId);
      if (!alive.current) return;
      setBilling(current => ({ ...current, [item.clientId]: snapshot }));
      if (openForm) {
        const pkg = snapshot.packages?.find(pkg => pkg.clientPackageId === item.clientPackageId);
        if (!pkg) throw new Error("Nie można odczytać wybranego pakietu. Sprawdź płatności klienta.");
        setAmount(String(pkg.amountDue)); setNote(""); setMethod("3"); setPaymentItem(item);
      }
    } catch (err) { if (alive.current) setBillingError(groupEnrollmentError(err)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  async function savePayment() {
    if (lock.current || !paymentItem || !editable || !paymentPackage) return;
    const value = Number(amount.replace(",", "."));
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(amount.trim()) || !Number.isFinite(value) || value <= 0 || !paymentMethodOptions.filter(option => option.value !== "4").some(option => option.value === method)) return;
    lock.current = true; setBusy(true); setActionError("");
    const item = paymentItem;
    try {
      if (!paymentIntent.current) paymentIntent.current = createStaffPaymentIntent();
      await paymentIntent.current.execute({ clientId: item.clientId, clientPackageId: item.clientPackageId, amount: value, method: Number(method) as PaymentMethod, note: note.trim() || null });
      paymentIntent.current = null;
      if (alive.current) { setPaymentItem(null); setNotice("Wpłata została dodana. Sprawdź status zgłoszenia."); }
      notifyClientPaymentChanged(item.clientId);
      try { prepared.current = await getGroupEnrollment(item.id); if (alive.current) setRecent(prepared.current); }
      catch { if (alive.current) setActionError("Wpłata jest zapisana. Nie udało się odświeżyć zgłoszenia."); }
    } catch (err) { if (alive.current) setActionError(groupEnrollmentError(err)); }
    finally { setPaymentUnresolved(paymentIntent.current?.unresolved ?? false); await refreshSession(); lock.current = false; if (alive.current) { setBusy(false); setRevision(value => value + 1); } }
  }
  async function confirmPayment() {
    if (lock.current || !paymentToConfirm || !editable) return;
    lock.current = true; setBusy(true); setActionError("");
    try {
      await confirmClientPayment(paymentToConfirm.id);
      notifyClientPaymentChanged(paymentToConfirm.clientId);
      if (alive.current) { setPaymentToConfirm(null); setNotice("Płatność została potwierdzona. Możesz sprawdzić udział."); }
    } catch (err) { if (alive.current) setActionError(groupEnrollmentError(err)); }
    finally { await refreshSession(); lock.current = false; if (alive.current) { setBusy(false); setRevision(value => value + 1); } }
  }
  const participants = session.participants || [];
  const booked = participants.filter(item => !isCancelledParticipant(item.attendanceStatus));
  const cancelled = participants.filter(item => isCancelledParticipant(item.attendanceStatus));
  const rows = [...(data?.items || [])];
  if (recent && !rows.some(item => item.id === recent.id)) rows.unshift(recent);
  const pending = rows.filter(item => item.status !== "Booked");
  const paymentPackage = paymentItem ? billing[paymentItem.clientId]?.packages?.find(pkg => pkg.clientPackageId === paymentItem.clientPackageId) : undefined;
  const participantRow = (item: (typeof participants)[number]) => <li key={item.clientId} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3">
    <div className="min-w-0"><Link href={`/owner/clients/${item.clientId}`} className="break-words text-sm font-semibold text-primary-light">{item.clientFullName || "Uczestnik bez nazwy"}</Link>{item.packageName ? <p className="mt-1 text-xs text-on-surface-muted">{item.packageName}</p> : null}</div>
    <span className="text-xs text-on-surface-variant">{attendanceLabel(item.attendanceStatus)}</span>
  </li>;

  return <section aria-label="Uczestnicy" className="space-y-4 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Uczestnicy</h3><p className="mt-1 text-sm text-on-surface-variant">{groupSeatsLabel(session)}{session.availableSeats != null ? ` · Wolne miejsca: ${session.availableSeats}` : ""}</p></div>
      {editable ? <Button type="button" size="sm" icon={<Plus size={16} />} disabled={busy || paymentItem !== null || paymentToConfirm !== null || !canAdd} onClick={() => { setActionError(""); setDraftOpen(true); }}>Dodaj uczestnika</Button> : null}
    </div>
    {!hasSession ? <p role="alert" className="text-sm text-error-light">Otwórz zajęcia ponownie, aby dodać uczestnika.</p> : null}
    {closed ? <p className="text-sm text-on-surface-muted">{session.status?.toLowerCase() === "cancelled" ? "Zajęcia są anulowane." : "Zajęcia są zakończone."}</p> : full ? <p className="text-sm text-on-surface-muted">Brak wolnych miejsc.</p> : !hasLocation ? <p role="alert" className="text-sm text-error-light">Uzupełnij lokalizację zajęć, aby dodać uczestnika.</p> : null}
    {draftOpen && editable ? <GroupEnrollmentDraft key={`${sessionId}:${session.locationId}`} sessionId={sessionId} sessionStartAt={session.startAt} disabled={busy || !canAdd} onPrepare={prepare} locationId={session.locationId} onClose={() => setDraftOpen(false)} /> : null}
    {actionError ? <p role="alert" className="text-sm text-error-light">{actionError}</p> : null}
    {notice ? <p role="status" className="text-sm text-tertiary-light">{notice}</p> : null}
    {booked.length ? <ul className="space-y-2">{booked.map(participantRow)}</ul> : !draftOpen && session.participants != null && !loading && !pending.length && !error ? <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4 text-sm text-on-surface-variant"><Users size={20} /><p>Jeszcze nikt nie jest zapisany na te zajęcia.</p></div> : null}
    {session.participants == null ? <p role="alert" className="text-sm text-on-surface-muted">Lista uczestników jest niedostępna.</p> : null}
    {loading ? <p role="status" className="text-sm text-on-surface-muted">Sprawdzanie zgłoszeń…</p> : null}
    {error ? <div role="alert" className="space-y-2 text-sm text-error-light"><p>{error}</p><Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setRevision(value => value + 1)}>Spróbuj ponownie</Button></div> : null}
    {billingError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant"><p>{billingError}</p><Button type="button" variant="secondary" size="sm" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Spróbuj ponownie</Button></div> : null}
    {pending.length ? <div><h4 className="mb-2 text-label text-on-surface-muted">Oczekujące zgłoszenia</h4><ul className="space-y-2">{pending.map(item => {
      const snapshot = billing[item.clientId];
      const pkg = snapshot?.packages?.find(pkg => pkg.clientPackageId === item.clientPackageId);
      const payments = snapshot?.payments?.filter(payment => payment.clientPackageId === item.clientPackageId && isPaymentPending(payment)) || [];
      return <li key={item.id} className="rounded-[var(--radius-lg)] bg-surface-container-low p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold">{item.clientName || snapshot?.clientName || labels[item.id]?.clientName || `Klient #${item.clientId}`}</p><p className="mt-1 text-xs text-on-surface-muted">{item.packageName || pkg?.packageName || labels[item.id]?.packageName || "Pakiet klienta"}</p></div><span className="rounded-full bg-surface-container px-2 py-1 text-xs text-info-light">{groupEnrollmentStatus(item.status)}</span></div>
        {item.status === "AwaitingPayment" ? <p className="mt-2 text-sm text-on-surface-variant">Do opłacenia: {item.amountDue.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p> : null}
        {item.clientEmail || item.clientPhone ? <p className="mt-1 text-xs text-on-surface-muted">{[item.clientEmail, item.clientPhone].filter(Boolean).join(" · ")}</p> : null}
        {item.packageTotalPrice != null ? <p className="mt-1 text-xs text-on-surface-muted">Pakiet teraz: {item.packageAmountPaid ?? "—"} z {item.packageTotalPrice} · {getPackagePaymentStatusLabel(item.packagePaymentStatus)} · wejścia {item.packageUsedEntries ?? "—"}/{item.packageTotalEntries ?? "—"}{item.packageIsActive === false ? " · nieaktywny" : ""}{item.packageValidUntil ? ` · ${groupPackageValidityLabel(item.packageValidUntil)}` : ""}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {editable && item.clientIsArchived !== true && item.allowedActions?.includes("Confirm") && item.status === "ReadyToBook" ? <Button type="button" size="sm" disabled={busy || full} onClick={() => void confirm(item)}>Potwierdź udział</Button> : null}
          {editable && item.clientIsArchived !== true && item.allowedActions?.includes("RecordPayment") ? <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void loadPaymentContext(item, true)}>Dodaj wpłatę</Button> : null}
          {editable && item.clientIsArchived !== true && item.status === "AwaitingPayment" ? <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void loadPaymentContext(item, false)}>Sprawdź wpłaty</Button> : null}
          {editable && item.clientIsArchived !== true ? payments.map(payment => <Button key={payment.id} type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setPaymentToConfirm(payment)}>Potwierdź wpłatę {formatMoney(payment.amount, payment.currency)}</Button>) : null}
          {item.status === "AwaitingPayment" ? <Link href={`/owner/clients/${item.clientId}/payments?clientPackageId=${item.clientPackageId}&groupEnrollmentId=${item.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-xs font-semibold text-primary-light">Historia płatności</Link> : null}
          {item.status === "PackageUnavailable" || item.status === "Unavailable" ? <span className="text-xs text-on-surface-muted">{item.status === "PackageUnavailable" ? "Wybierz inny pakiet, dodając uczestnika ponownie." : "Nie można teraz potwierdzić udziału."}</span> : null}
        </div>
      </li>;
    })}</ul></div> : null}
    {cancelled.length ? <SessionAccordion title="Anulowane zapisy" summary={cancelled.length}><ul className="space-y-2">{cancelled.map(participantRow)}</ul></SessionAccordion> : null}
    {data && data.totalPages > 1 ? <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-muted"><span>Strona {data.page} z {data.totalPages}</span><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" disabled={busy || loading || page <= 1} onClick={() => setPage(value => value - 1)}>Poprzednia</Button><Button type="button" size="sm" variant="secondary" disabled={busy || loading || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Następna</Button></div></div> : null}
    {!loading && !error ? <Button type="button" variant="ghost" size="sm" icon={<RefreshCw size={14} />} disabled={busy} onClick={() => { setRevision(value => value + 1); void refreshSession(); }}>Odśwież</Button> : null}
    {paymentItem && typeof document !== "undefined" ? createPortal(<OrganizationPortalScope onSubmit={event => event.stopPropagation()}>
      <PaymentEntryModal open eyebrow="Wpłata do pakietu" title="Dodaj wpłatę" description={billing[paymentItem.clientId]?.clientName || "Wpłata za pakiet uczestnika"} amount={amount} packageId={String(paymentItem.clientPackageId)} method={method} note={note} packageOptions={paymentPackage ? [{ value: String(paymentPackage.clientPackageId), label: paymentPackage.packageName || "Pakiet klienta", amountDue: paymentPackage.amountDue, currency: paymentPackage.currency }] : []} methodOptions={paymentMethodOptions.filter(option => option.value !== "4")} isSubmitting={busy} unresolved={paymentUnresolved} error={actionError} submitLabel="Dodaj wpłatę" submittingLabel="Zapisywanie…" emptyPackagesMessage="Nie udało się pobrać pakietu." onAmountChange={setAmount} onPackageChange={() => {}} onMethodChange={setMethod} onNoteChange={setNote} onClose={() => { if (!lock.current && !paymentIntent.current?.unresolved) { paymentIntent.current = null; setPaymentItem(null); } }} onSubmit={() => void savePayment()} />
      {actionError ? <p role="alert" className="fixed bottom-4 left-4 right-4 z-[60] rounded-lg bg-error-container p-3 text-sm text-error-light">{actionError}</p> : null}
    </OrganizationPortalScope>, document.body) : null}
    {paymentToConfirm && typeof document !== "undefined" ? createPortal(<OrganizationPortalScope><PaymentActionConfirmModal payment={paymentToConfirm} title="Potwierdź otrzymaną wpłatę" description="Potwierdź tylko pieniądze, które studio już otrzymało." confirmLabel="Potwierdź wpłatę" processing={busy} onClose={() => { if (!lock.current) setPaymentToConfirm(null); }} onConfirm={() => void confirmPayment()} />{actionError ? <p role="alert" className="fixed bottom-4 left-4 right-4 z-[60] rounded-lg bg-error-container p-3 text-sm text-error-light">{actionError}</p> : null}</OrganizationPortalScope>, document.body) : null}
  </section>;
}
