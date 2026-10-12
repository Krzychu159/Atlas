"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { getClientBilling, getPackagePaymentStatusLabel, type ClientBillingSummary, type PagedResult } from "@/app/lib/owner/billing";
import { confirmGroupEnrollment, getGroupEnrollment, getGroupEnrollments, groupEnrollmentError, groupEnrollmentStatus, type GroupEnrollment } from "@/app/lib/owner/group-enrollments";
import { formatMoney } from "@/app/lib/formatters/money";
import { notifySessionCorrected } from "@/app/lib/session-corrections";

export default function GroupEnrollmentsSection({ sessionId, canConfirm, onChanged, onBusyChange }: {
  sessionId: number; canConfirm: boolean; onChanged?: () => Promise<void>; onBusyChange: (busy: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<GroupEnrollment> | null>(null);
  const [billing, setBilling] = useState<Record<number, ClientBillingSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const alive = useRef(true);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const result = await getGroupEnrollments(sessionId, page, signal);
      if (!result || (!Array.isArray(result.items) && result.items !== null) || !Number.isSafeInteger(result.page) || result.page < 1 || !Number.isSafeInteger(result.pageSize) || result.pageSize < 1 || !Number.isSafeInteger(result.totalCount) || result.totalCount < 0 || !Number.isSafeInteger(result.totalPages) || result.totalPages < 0) throw new Error("Lista zgłoszeń jest niedostępna. Spróbuj odświeżyć dane.");
      const ids = [...new Set((result.items || []).map(item => item.clientId))];
      const snapshots = await Promise.allSettled(ids.map(id => getClientBilling(id)));
      if (signal.aborted) return;
      const next: Record<number, ClientBillingSummary> = {};
      snapshots.forEach((snapshot, index) => { if (snapshot.status === "fulfilled") next[ids[index]] = snapshot.value; });
      setBilling(next); setData(result);
      if (snapshots.some(snapshot => snapshot.status === "rejected")) setError("Nie udało się sprawdzić wszystkich płatności. Odśwież zgłoszenia, aby sprawdzić je ponownie.");
    } catch (err) {
      if (!signal.aborted) { setData(null); setBilling({}); setError(groupEnrollmentError(err)); }
    } finally { if (!signal.aborted) setLoading(false); }
  }, [sessionId, page]);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    return () => { controller.abort(); alive.current = false; };
  }, [load, revision]);

  async function confirm(item: GroupEnrollment) {
    if (lock.current || !canConfirm) return;
    lock.current = true; setPending(item.id); onBusyChange(true); setActionError(""); setNotice("");
    let committed = false;
    try {
      // The enrollment amount is not proof of payment. Re-read the linked package.
      const [latest, latestBilling] = await Promise.all([getGroupEnrollment(item.id), getClientBilling(item.clientId)]);
      const linked = latestBilling.packages?.find(pkg => pkg.clientPackageId === latest.clientPackageId);
      if (latest.sessionId !== sessionId || latest.clientId !== item.clientId || latest.clientPackageId !== item.clientPackageId) throw new Error("Dane zgłoszenia zmieniły się. Odśwież zgłoszenia i sprawdź przypisany pakiet.");
      if (!["AwaitingPayment", "ReadyToBook"].includes(latest.status || "") || linked?.paymentStatus !== "Paid" || latest.reservesSeat !== false) throw new Error("Zapis wymaga opłaconego pakietu i zgłoszenia oczekującego na potwierdzenie. Odśwież dane przed kolejną decyzją.");
      const confirmed = await confirmGroupEnrollment(item.id);
      committed = true;
      notifySessionCorrected();
      if (alive.current) {
        setData(current => current ? { ...current, items: current.items?.map(row => row.id === confirmed.id ? confirmed : row) || [] } : current);
        setNotice(confirmed.status === "Booked" && confirmed.reservesSeat ? "Zapis został potwierdzony." : "Zgłoszenie zostało zaktualizowane. Sprawdź jego bieżący status.");
      }
      await onChanged?.();
    } catch (err) {
      if (alive.current) setActionError(committed ? "Zapis został potwierdzony, ale nie udało się odświeżyć wszystkich danych. Odśwież zgłoszenia i szczegóły zajęć." : groupEnrollmentError(err));
    } finally {
      lock.current = false; onBusyChange(false);
      if (alive.current) { setPending(null); setRevision(value => value + 1); }
    }
  }

  return <section className="space-y-3" aria-label="Zgłoszenia grupowe">
    <p className="text-sm leading-6 text-on-surface-variant">Zgłoszenie oczekujące na płatność nie zajmuje miejsca ani nie zużywa wejścia. Częściowa wpłata lub zgłoszony przelew nie potwierdzają opłacenia pakietu. Gotowość do zapisu nie gwarantuje wolnego miejsca.</p>
    <p className="text-xs text-on-surface-muted">Dodawanie nowych zgłoszeń jest obecnie niedostępne. Możesz obsłużyć zgłoszenia widoczne poniżej.</p>
    {error ? <p role="alert" className="text-sm text-error-light">{error}</p> : null}
    {actionError ? <p role="alert" className="text-sm text-error-light">{actionError}</p> : null}
    {notice ? <p role="status" className="text-sm text-tertiary-light">{notice}</p> : null}
    <Button type="button" variant="secondary" size="sm" disabled={loading || pending !== null} onClick={() => {
      setRevision(value => value + 1);
      void onChanged?.().catch(err => setActionError(groupEnrollmentError(err)));
    }}>Odśwież zgłoszenia i płatności</Button>
    {loading ? <p role="status" className="text-sm">Ładowanie zgłoszeń…</p> : data ? <>
      {(data.items || []).length ? <ul className="space-y-3">{data.items?.map(item => {
        const snapshot = billing[item.clientId];
        const pkg = snapshot?.packages?.find(pkg => pkg.clientPackageId === item.clientPackageId);
        const paid = pkg?.paymentStatus === "Paid";
        const amount = pkg?.amountDue ?? item.amountDue;
        return <li key={item.id} className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{snapshot?.clientName || `Klient #${item.clientId}`}</p><p className="mt-1 text-sm text-on-surface-variant">{pkg?.packageName || "Pakiet przypisany do zgłoszenia"}</p></div><span className="rounded-full bg-surface-container px-3 py-1 text-xs text-primary-light">{groupEnrollmentStatus(item.status)}</span></div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-on-surface-muted">Płatność</dt><dd>{pkg ? getPackagePaymentStatusLabel(pkg.paymentStatus) : "Nie udało się sprawdzić"}</dd></div><div><dt className="text-on-surface-muted">Do zapłaty</dt><dd>{typeof amount === "number" && Number.isFinite(amount) ? pkg?.currency ? formatMoney(amount, pkg.currency) : new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) : "Brak danych"}</dd></div><div><dt className="text-on-surface-muted">Miejsce</dt><dd>{item.reservesSeat === true ? "Zarezerwowane" : item.reservesSeat === false ? "Niezarezerwowane" : "Brak danych"}</dd></div></dl>
          <div className="mt-3 flex flex-wrap gap-3">
            {canConfirm && item.status === "AwaitingPayment" && pkg && !paid ? <Link href={`/owner/clients/${item.clientId}/payments?clientPackageId=${item.clientPackageId}&addPayment=1`} className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-light">Dodaj wpłatę do pakietu</Link> : null}
            {canConfirm && ["AwaitingPayment", "ReadyToBook"].includes(item.status || "") && paid && item.reservesSeat === false ? <Button type="button" size="sm" disabled={pending !== null} onClick={() => void confirm(item)}>{pending === item.id ? "Potwierdzanie…" : "Potwierdź zapis"}</Button> : null}
          </div>
        </li>;
      })}</ul> : <p className="text-sm text-on-surface-muted">Brak zgłoszeń dla tych zajęć.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-muted"><span>{data.totalCount} zgłoszeń · Strona {data.page} z {Math.max(data.totalPages, 1)}</span><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" disabled={page <= 1 || pending !== null} onClick={() => setPage(value => value - 1)}>Poprzednia</Button><Button type="button" size="sm" variant="secondary" disabled={page >= data.totalPages || pending !== null} onClick={() => setPage(value => value + 1)}>Następna</Button></div></div>
    </> : null}
  </section>;
}
