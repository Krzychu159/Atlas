"use client";

import { notifyClientPaymentChanged } from "@/app/lib/session-corrections";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import { paymentMethodOptions, type ClientPayment } from "@/app/lib/owner/billing";
import { confirmTrainerPortalPayment, rejectTrainerPortalPayment } from "@/app/lib/trainer/portal";
import { getTrainerPendingPage } from "@/app/lib/trainer/optimized";
import { ApiError } from "@/app/lib/backend";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";
import { useClientPaymentRevision, usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";

const PAGE_SIZE = 10;

export default function TrainerPaymentsPage() {
  const paymentDateRevision = usePaymentDateCorrectionRevision();
  const paymentRevision = useClientPaymentRevision();
  const changesKey = `${paymentDateRevision}:${paymentRevision}`;
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ type: "confirm" | "reject"; payment: ClientPayment } | null>(null);
  const [reason, setReason] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const submitting = useRef(false);
  const loadRevision = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const queryKey = JSON.stringify([search.trim(), method, sort, page]);
  const isLoading = loading || loadedKey !== queryKey;
  const serverSort = sort === "amount" ? "amountDesc" : sort === "oldest" ? "paymentDate" : "paymentDateDesc";
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const [previousPaymentDateRevision, setPreviousPaymentDateRevision] = useState(changesKey);
  if (previousPaymentDateRevision !== changesKey) {
    setPreviousPaymentDateRevision(changesKey); setIsLoading(true); setLoadError(null);
  }

  const loadPayments = useCallback(async () => {
    if (!mounted.current || search.trim() !== debouncedSearch) return;
    const revision = ++loadRevision.current;
    loadController.current?.abort();
    const controller = new AbortController(); loadController.current = controller;
    return getTrainerPendingPage({ Page: page, PageSize: PAGE_SIZE, Search: debouncedSearch || undefined,
      Method: method === "all" ? undefined : Number(method), Sort: serverSort,
    }, controller.signal).then(data => {
      if (revision !== loadRevision.current) return;
      if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
      setPayments(data.items || []); setTotalCount(data.totalCount); setLoadedKey(queryKey); setLoadError(null);
    }).catch(error => {
      if (revision !== loadRevision.current) return;
      const message = trainerPaymentError(error, "Nie udało się pobrać wpłat oczekujących. Spróbuj ponownie.");
      setLoadError(message); setPayments([]); setLoadedKey(queryKey);
      showAppError(new Error(message), message);
    }).finally(() => {
      if (revision === loadRevision.current) setIsLoading(false);
    });
  }, [search, debouncedSearch, page, method, serverSort, queryKey]);
  function reloadPayments() { setIsLoading(true); setLoadError(null); return loadPayments(); }

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    void loadPayments();
    return () => { loadRevision.current += 1; loadController.current?.abort(); };
  }, [loadPayments, paymentDateRevision, paymentRevision]);

  const filteredPayments = loadedKey === queryKey ? payments : [];
  const currentPage = page;

  async function submitAction() {
    if (isLoading || !action || submitting.current || (action.type === "confirm" && action.payment.canConfirm !== true)) return;
    submitting.current = true;
    setProcessingId(action.payment.id);
    try {
      if (action.type === "confirm") await confirmTrainerPortalPayment(action.payment.id);
      else await rejectTrainerPortalPayment(action.payment.id, reason.trim());
      notifyClientPaymentChanged(action.payment.clientId);
      if (!mounted.current) return;
      showAppSuccess(action.type === "confirm" ? "Wpłata została potwierdzona." : "Wpłata została odrzucona.");
      setAction(null);
      setReason("");
    } catch (error) {
      if (!mounted.current) return;
      const message = trainerPaymentError(error, "Nie udało się zapisać zmiany wpłaty. Spróbuj ponownie.");
      showAppError(new Error(message), message);
      if (error instanceof ApiError && [403, 404, 409].includes(error.status)) { setAction(null); notifyClientPaymentChanged(action.payment.clientId); }
    } finally {
      submitting.current = false;
      setProcessingId(null);
    }
  }

  function closeAction() {
    if (submitting.current) return;
    setAction(null);
    setReason("");
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label text-primary-light">Płatności</p>
          <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-tight tracking-tight">Wpłaty oczekujące</h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">Wpłaty wymagające ręcznego potwierdzenia. Historię wpłat i rozliczenia znajdziesz w profilu klienta.</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} disabled={isLoading || processingId !== null} onClick={() => void reloadPayments()}>Odśwież</Button>
      </section>
      <div className="card-shell grid gap-3 p-4 md:grid-cols-[1fr_220px_220px]">
        <Input aria-label="Szukaj wpłaty" placeholder="Szukaj klienta lub e-maila..." maxLength={100} icon={<Search size={16} />} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <CustomSelect label="Metoda płatności" value={method} onChange={(value) => { setMethod(value); setPage(1); }} options={[{ value: "all", label: "Wszystkie metody" }, ...paymentMethodOptions]} />
        <CustomSelect label="Sortowanie" value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "newest", label: "Od najnowszych" }, { value: "oldest", label: "Od najstarszych" }, { value: "amount", label: "Od największej kwoty" }]} />
      </div>
      <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft">
        {loadError && !isLoading ? <div role="alert" className="p-6 text-on-surface-variant">{loadError}<Button className="mt-4" variant="secondary" onClick={() => void reloadPayments()}>Spróbuj ponownie</Button></div> : <>
          <PaymentsList dateCorrectionPortal="trainer" payments={filteredPayments} isLoading={isLoading} processingId={processingId}
            getDetailsHref={(payment) => "/trainer/clients/" + payment.clientId + "/payments"}
            emptyTitle={payments.length ? "Brak pasujących wpłat" : "Brak wpłat oczekujących"}
            emptyMessage={payments.length ? "Zmień wyszukiwanie lub metodę płatności." : "Wszystkie wpłaty wymagające ręcznego potwierdzenia zostały obsłużone."}
            canConfirm={(payment) => payment.canConfirm === true}
            onConfirm={(payment) => { if (!submitting.current && payment.canConfirm === true) setAction({ type: "confirm", payment }); }}
            onReject={(payment) => { if (!submitting.current) { setReason(""); setAction({ type: "reject", payment }); } }} />
          {!isLoading && totalCount > 0 ? <PaymentPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={totalCount} onPageChange={setPage} /> : null}
        </>}
      </section>
      {action?.type === "confirm" ? <PaymentActionConfirmModal payment={action.payment} title="Potwierdzić wpłatę?" description="Potwierdź, jeśli wpłata rzeczywiście dotarła. Zostanie uwzględniona w rozliczeniu klienta." confirmLabel="Potwierdź wpłatę" processing={processingId !== null} onClose={closeAction} onConfirm={() => void submitAction()} /> : null}
      {action?.type === "reject" ? <PaymentReasonModal payment={action.payment} title="Odrzucić wpłatę?" description="Odrzucona wpłata pozostanie w historii klienta." reasonLabel="Powód odrzucenia (opcjonalnie)" reason={reason} placeholder="Np. wpłata nie dotarła" confirmLabel="Odrzuć wpłatę" processing={processingId !== null} action="reject" onReasonChange={setReason} onClose={closeAction} onConfirm={() => void submitAction()} /> : null}
    </div>
  );
}
