"use client";

import { notifyClientPaymentChanged } from "@/app/lib/session-corrections";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { PaymentActionConfirmModal, trainerIssueReceiptCopy } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import { paymentMethodOptions, type ClientPayment } from "@/app/lib/owner/billing";
import { confirmTrainerPortalPayment, getTrainerPortalPendingPayments, getTrainerPortalPendingReceipts, issueTrainerPortalPaymentReceipt, rejectTrainerPortalPayment } from "@/app/lib/trainer/portal";
import { ApiError } from "@/app/lib/backend";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";
import { useClientPaymentRevision, usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";

const PAGE_SIZE = 10;

type PaymentView = "all" | "pending" | "receipts";
type PaymentsResult = {
  key: string;
  pending: ClientPayment[];
  receipts: ClientPayment[];
  pendingError: string | null;
  receiptsError: string | null;
};

const emptyCopy: Record<PaymentView, { title: string; message: string }> = {
  all: { title: "Nic nie czeka na obsłużenie", message: "Wpłaty są potwierdzone, a paragony oznaczone." },
  pending: { title: "Brak wpłat oczekujących", message: "Wszystkie wpłaty wymagające ręcznego potwierdzenia zostały obsłużone." },
  receipts: { title: "Wszystkie paragony są oznaczone", message: "Nowe wpłaty pojawią się tutaj po ich potwierdzeniu." },
};

export default function TrainerPaymentsPage() {
  const paymentDateRevision = usePaymentDateCorrectionRevision();
  const paymentRevision = useClientPaymentRevision();
  const [reloadCount, setReloadCount] = useState(0);
  const loadKey = `${paymentDateRevision}:${paymentRevision}:${reloadCount}`;
  const [result, setResult] = useState<PaymentsResult | null>(null);
  const [view, setView] = useState<PaymentView>("all");
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ type: "confirm" | "reject" | "issueReceipt"; payment: ClientPayment } | null>(null);
  const [reason, setReason] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const isLoading = result?.key !== loadKey;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled([
      getTrainerPortalPendingPayments(controller.signal),
      getTrainerPortalPendingReceipts(controller.signal),
    ]).then(([pending, receipts]) => {
      if (controller.signal.aborted) return;
      setResult({
        key: loadKey,
        pending: pending.status === "fulfilled" ? pending.value || [] : [],
        receipts: receipts.status === "fulfilled" ? receipts.value || [] : [],
        pendingError: pending.status === "rejected" ? trainerPaymentError(pending.reason, "Nie udało się pobrać wpłat oczekujących. Spróbuj ponownie.") : null,
        receiptsError: receipts.status === "rejected" ? trainerPaymentError(receipts.reason, "Nie udało się pobrać wpłat czekających na paragon. Spróbuj ponownie.") : null,
      });
    });
    return () => controller.abort();
  }, [loadKey]);

  const viewError = isLoading ? null : view === "pending" ? result?.pendingError : view === "receipts" ? result?.receiptsError : result?.pendingError || result?.receiptsError;
  const nothingLoaded = view === "all" ? Boolean(result?.pendingError && result?.receiptsError) : Boolean(viewError);

  const filteredPayments = useMemo(() => {
    const source = view === "pending" ? result?.pending || [] : view === "receipts" ? result?.receipts || [] : [...(result?.pending || []), ...(result?.receipts || [])];
    const unique = [...new Map(source.map((payment) => [payment.id, payment])).values()];
    const query = search.trim().toLocaleLowerCase("pl");
    return unique
      .filter((payment) => (method === "all" || payment.method === Number(method)) && (!query || payment.clientName?.toLocaleLowerCase("pl").includes(query)))
      .sort((first, second) => {
        if (sort === "amount") return second.amount - first.amount;
        const difference = new Date(first.paymentDate).getTime() - new Date(second.paymentDate).getTime();
        return sort === "oldest" ? difference : -difference;
      });
  }, [result?.pending, result?.receipts, view, search, method, sort]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE)));
  const visiblePayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = Boolean(search.trim()) || method !== "all";

  const pendingCount = !isLoading && !result?.pendingError ? result?.pending.length ?? null : null;
  const receiptsCount = !isLoading && !result?.receiptsError ? result?.receipts.length ?? null : null;
  const allCount = pendingCount !== null && receiptsCount !== null ? pendingCount + receiptsCount : null;

  function changeView(next: PaymentView) {
    setView(next);
    setPage(1);
  }

  async function submitAction() {
    if (isLoading || !action || submitting.current || (action.type === "confirm" && action.payment.canConfirm !== true)) return;
    submitting.current = true;
    setProcessingId(action.payment.id);
    try {
      if (action.type === "issueReceipt") {
        await issueTrainerPortalPaymentReceipt(action.payment.id);
        if (!mounted.current) return;
        setResult((current) => current && { ...current, receipts: current.receipts.filter((item) => item.id !== action.payment.id) });
        showAppSuccess("Paragon został oznaczony jako wystawiony.");
      } else {
        if (action.type === "confirm") await confirmTrainerPortalPayment(action.payment.id);
        else await rejectTrainerPortalPayment(action.payment.id, reason.trim());
        notifyClientPaymentChanged(action.payment.clientId);
        if (!mounted.current) return;
        showAppSuccess(action.type === "confirm" ? "Wpłata została potwierdzona." : "Wpłata została odrzucona.");
      }
      setAction(null);
      setReason("");
    } catch (error) {
      if (!mounted.current) return;
      const message = trainerPaymentError(error, action.type === "issueReceipt" ? "Nie udało się oznaczyć paragonu." : "Nie udało się zapisać zmiany wpłaty. Spróbuj ponownie.");
      showAppError(new Error(message), message);
      if (error instanceof ApiError && (action.type === "issueReceipt" ? [400, 403, 404, 409] : [403, 404, 409]).includes(error.status)) {
        setAction(null);
        setReloadCount((value) => value + 1);
      }
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
          <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-tight tracking-tight">Wpłaty do obsłużenia</h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">Potwierdzaj wpłaty i oznaczaj wybite paragony. Pełną historię wpłat znajdziesz w profilu klienta.</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} disabled={isLoading || processingId !== null} onClick={() => setReloadCount((value) => value + 1)}>Odśwież</Button>
      </section>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Rodzaj wpłat">
        <ViewTile label="Wszystkie" hint="Wymagają Twojej reakcji" count={allCount} active={view === "all"} onClick={() => changeView("all")} />
        <ViewTile label="Oczekujące" hint="Czekają na potwierdzenie" count={pendingCount} active={view === "pending"} onClick={() => changeView("pending")} />
        <ViewTile label="Bez paragonu" hint="Czekają na wybicie paragonu" count={receiptsCount} active={view === "receipts"} onClick={() => changeView("receipts")} />
      </div>
      <div className="card-shell grid gap-3 p-4 md:grid-cols-[1fr_220px_220px]">
        <Input aria-label="Szukaj wpłaty" placeholder="Szukaj klienta..." maxLength={100} icon={<Search size={16} />} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <CustomSelect label="Metoda płatności" value={method} onChange={(value) => { setMethod(value); setPage(1); }} options={[{ value: "all", label: "Wszystkie metody" }, ...paymentMethodOptions]} />
        <CustomSelect label="Sortowanie" value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "newest", label: "Od najnowszych" }, { value: "oldest", label: "Od najstarszych" }, { value: "amount", label: "Od największej kwoty" }]} />
      </div>
      <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft">
        {viewError ? <div role="alert" className="p-6 text-on-surface-variant">{viewError}<Button className="mt-4 block" variant="secondary" onClick={() => setReloadCount((value) => value + 1)}>Spróbuj ponownie</Button></div> : null}
        {nothingLoaded && !isLoading ? null : <>
          <PaymentsList dateCorrectionPortal="trainer" payments={visiblePayments} isLoading={isLoading} processingId={processingId}
            getDetailsHref={(payment) => "/trainer/clients/" + payment.clientId + "/payments"}
            emptyTitle={hasFilters ? "Brak pasujących wpłat" : emptyCopy[view].title}
            emptyMessage={hasFilters ? "Zmień wyszukiwanie lub metodę płatności." : emptyCopy[view].message}
            canConfirm={(payment) => payment.canConfirm === true}
            onConfirm={(payment) => { if (!submitting.current && payment.canConfirm === true) setAction({ type: "confirm", payment }); }}
            onReject={(payment) => { if (!submitting.current) { setReason(""); setAction({ type: "reject", payment }); } }}
            onIssueReceipt={(payment) => { if (!submitting.current) setAction({ type: "issueReceipt", payment }); }} />
          {!isLoading && filteredPayments.length > 0 ? <PaymentPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filteredPayments.length} onPageChange={setPage} /> : null}
        </>}
      </section>
      {action?.type === "confirm" ? <PaymentActionConfirmModal payment={action.payment} title="Potwierdzić wpłatę?" description="Potwierdź, jeśli wpłata rzeczywiście dotarła. Zostanie uwzględniona w rozliczeniu klienta." confirmLabel="Potwierdź wpłatę" processing={processingId !== null} onClose={closeAction} onConfirm={() => void submitAction()} /> : null}
      {action?.type === "issueReceipt" ? <PaymentActionConfirmModal payment={action.payment} {...trainerIssueReceiptCopy} processing={processingId !== null} onClose={closeAction} onConfirm={() => void submitAction()} /> : null}
      {action?.type === "reject" ? <PaymentReasonModal payment={action.payment} title="Odrzucić wpłatę?" description="Odrzucona wpłata pozostanie w historii klienta." reasonLabel="Powód odrzucenia (opcjonalnie)" reason={reason} placeholder="Np. wpłata nie dotarła" confirmLabel="Odrzuć wpłatę" processing={processingId !== null} action="reject" onReasonChange={setReason} onClose={closeAction} onConfirm={() => void submitAction()} /> : null}
    </div>
  );
}

function ViewTile({ label, hint, count, active, onClick }: { label: string; hint: string; count: number | null; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={hint}
      className={`flex min-h-10 flex-1 items-center justify-between gap-2 whitespace-nowrap rounded-[var(--radius-lg)] px-3 py-2 text-left transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_35%,transparent)] md:min-w-[170px] md:flex-none ${
        active ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
      }`}
    >
      <span className="text-xs font-semibold md:text-sm">{label}</span>
      <span className="shrink-0 text-sm font-semibold">{count ?? "–"}</span>
    </button>
  );
}
