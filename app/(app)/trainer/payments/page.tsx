"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { confirmTrainerPortalPayment, getTrainerPortalPendingPayments, rejectTrainerPortalPayment } from "@/app/lib/trainer/portal";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";

const PAGE_SIZE = 10;

export default function TrainerPaymentsPage() {
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadPayments = useCallback(async () => {
    const revision = ++loadRevision.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getTrainerPortalPendingPayments();
      if (revision !== loadRevision.current) return;
      setPayments(data);
      setPage(1);
    } catch (error) {
      if (revision !== loadRevision.current) return;
      const message = trainerPaymentError(error, "Nie udało się pobrać wpłat oczekujących. Spróbuj ponownie.");
      setLoadError(message);
      showAppError(new Error(message), message);
    } finally {
      if (revision === loadRevision.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
    return () => { loadRevision.current += 1; };
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pl-PL");
    return payments.filter((payment) =>
      (method === "all" || String(payment.method) === method) &&
      (!query || [payment.clientName, payment.packageName, payment.note].some((value) => value?.toLocaleLowerCase("pl-PL").includes(query))),
    ).sort((first, second) => {
      if (sort === "amount") return second.amount - first.amount;
      const difference = Date.parse(second.paymentDate || second.createdAt) - Date.parse(first.paymentDate || first.createdAt);
      return sort === "oldest" ? -difference : difference;
    });
  }, [payments, search, method, sort]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE)));

  async function submitAction() {
    if (!action || submitting.current) return;
    submitting.current = true;
    setProcessingId(action.payment.id);
    try {
      if (action.type === "confirm") await confirmTrainerPortalPayment(action.payment.id);
      else await rejectTrainerPortalPayment(action.payment.id, reason.trim());
      showAppSuccess(action.type === "confirm" ? "Wpłata została potwierdzona." : "Wpłata została odrzucona.");
      setAction(null);
      setReason("");
      await loadPayments();
    } catch (error) {
      const message = trainerPaymentError(error, "Nie udało się zapisać zmiany wpłaty. Spróbuj ponownie.");
      showAppError(new Error(message), message);
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
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-tight tracking-tight">Wpłaty oczekujące</h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">Wpłaty wymagające ręcznego potwierdzenia. Historię wpłat i rozliczenia znajdziesz w profilu klienta.</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} disabled={isLoading || processingId !== null} onClick={() => void loadPayments()}>Odśwież</Button>
      </section>
      <div className="card-shell grid gap-3 p-4 md:grid-cols-[1fr_220px_220px]">
        <Input aria-label="Szukaj wpłaty" placeholder="Szukaj klienta lub pakietu..." icon={<Search size={16} />} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <CustomSelect label="Metoda płatności" value={method} onChange={(value) => { setMethod(value); setPage(1); }} options={[{ value: "all", label: "Wszystkie metody" }, ...paymentMethodOptions]} />
        <CustomSelect label="Sortowanie" value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "newest", label: "Od najnowszych" }, { value: "oldest", label: "Od najstarszych" }, { value: "amount", label: "Od największej kwoty" }]} />
      </div>
      <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft">
        {loadError && !isLoading ? <div role="alert" className="p-6 text-on-surface-variant">{loadError}<Button className="mt-4" variant="secondary" onClick={() => void loadPayments()}>Spróbuj ponownie</Button></div> : <>
          <PaymentsList payments={filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)} isLoading={isLoading} processingId={processingId}
            getDetailsHref={(payment) => "/trainer/clients/" + payment.clientId + "/payments"}
            emptyTitle={payments.length ? "Brak pasujących wpłat" : "Brak wpłat oczekujących"}
            emptyMessage={payments.length ? "Zmień wyszukiwanie lub metodę płatności." : "Wszystkie wpłaty wymagające ręcznego potwierdzenia zostały obsłużone."}
            onConfirm={(payment) => { if (!submitting.current) setAction({ type: "confirm", payment }); }}
            onReject={(payment) => { if (!submitting.current) { setReason(""); setAction({ type: "reject", payment }); } }} />
          {!isLoading && filteredPayments.length > 0 ? <PaymentPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filteredPayments.length} onPageChange={setPage} /> : null}
        </>}
      </section>
      {action?.type === "confirm" ? <PaymentActionConfirmModal payment={action.payment} title="Potwierdzić wpłatę?" description="Potwierdź, jeśli wpłata rzeczywiście dotarła. Zostanie uwzględniona w rozliczeniu klienta." confirmLabel="Potwierdź wpłatę" processing={processingId !== null} onClose={closeAction} onConfirm={() => void submitAction()} /> : null}
      {action?.type === "reject" ? <PaymentReasonModal payment={action.payment} title="Odrzucić wpłatę?" description="Odrzucona wpłata pozostanie w historii klienta." reasonLabel="Powód odrzucenia (opcjonalnie)" reason={reason} placeholder="Np. wpłata nie dotarła" confirmLabel="Odrzuć wpłatę" processing={processingId !== null} action="reject" onReasonChange={setReason} onClose={closeAction} onConfirm={() => void submitAction()} /> : null}
    </div>
  );
}
