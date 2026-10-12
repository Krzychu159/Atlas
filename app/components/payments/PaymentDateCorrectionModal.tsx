"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/app/lib/backend";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { showAppSuccess } from "@/app/components/ui/app-toast";
import { formatDateTime } from "@/app/lib/formatters/date";
import { updateClientPaymentDate } from "@/app/lib/owner/billing";
import { updateTrainerPaymentDate } from "@/app/lib/trainer/portal";
import { canCorrectPaymentDate, paymentDateError, paymentDateInput, paymentDateWithOffset, refreshPaymentForDateCorrection } from "@/app/lib/payments/date-correction";
import { notifyPaymentDateCorrected } from "@/app/lib/session-corrections";
import type { PaymentDisplaySource } from "./PaymentDisplay";

export default function PaymentDateCorrectionModal({ payment, portal, onClose }: { payment: PaymentDisplaySource; portal: "owner" | "trainer"; onClose: () => void }) {
  const [current, setCurrent] = useState(payment);
  const [value, setValue] = useState(paymentDateInput(payment.paymentDate || ""));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const nextDate = paymentDateWithOffset(value);
  const unchanged = nextDate !== null && (paymentDateInput(nextDate) === paymentDateInput(current.paymentDate || "") || Date.parse(nextDate) === Date.parse(current.paymentDate || ""));
  const valid = nextDate !== null && Date.parse(nextDate) <= Date.now() && reason.trim().length >= 1 && reason.trim().length <= 1000 && !unchanged;

  async function refresh() {
    const latest = await refreshPaymentForDateCorrection(portal, payment.clientId, payment.id);
    if (alive.current) { setCurrent(latest); setNeedsRefresh(false); setReviewRequired(true); }
  }

  async function reload() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await refresh(); setError("Sprawdź aktualną datę wpłaty i ponownie zatwierdź korektę."); }
    catch (err) { setError(paymentDateError(err)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  async function submit() {
    if (lock.current || reviewRequired || needsRefresh || !canCorrectPaymentDate(current)) return;
    if (!nextDate || Date.parse(nextDate) > Date.now()) { setError("Wybierz poprawną datę i godzinę, która nie jest w przyszłości."); return; }
    if (!reason.trim() || reason.trim().length > 1000) { setError("Podaj powód korekty od 1 do 1000 znaków."); return; }
    if (unchanged) { setError("Wybierz inną datę lub godzinę wpłaty."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const payload = { paymentDate: nextDate, expectedPaymentDate: current.paymentDate!, reason: reason.trim() };
      const updated = portal === "owner" ? await updateClientPaymentDate(current.id, payload) : await updateTrainerPaymentDate(current.id, payload);
      notifyPaymentDateCorrected(updated.clientId);
      showAppSuccess("Korekta daty wpłaty została zapisana.");
      onClose();
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof ApiError && err.status === 409) {
        setReviewRequired(true); setNeedsRefresh(true);
        setError("Wpłata zmieniła się. Zachowaliśmy formularz. Sprawdź aktualną datę przed ponownym zatwierdzeniem.");
        try { await refresh(); } catch (refreshError) { setError(paymentDateError(refreshError)); }
      } else {
        setError(paymentDateError(err));
        if (!(err instanceof ApiError) || err.status >= 500) { setNeedsRefresh(true); setReviewRequired(true); }
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  return <ModalOverlay onClose={busy ? undefined : onClose}>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} role="dialog" aria-modal="true" aria-label="Zmień datę wpłaty" className="relative flex max-h-[92vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient">
      <div className="overflow-y-auto p-5 md:p-6">
        <ModalHeader eyebrow="Korekta wpłaty" title="Zmień datę wpłaty" description="Wpisz datę otrzymania wpłaty i powód korekty." onClose={() => { if (!busy) onClose(); }} />
        <p className="mt-4 text-sm text-on-surface-variant">Aktualna data: {formatDateTime(current.paymentDate)}</p>
        {error ? <p role="alert" className="mt-4 text-sm text-error-light">{error}</p> : null}
        {!canCorrectPaymentDate(current) ? <p className="mt-4 text-sm text-on-surface-variant">Ta wpłata nie kwalifikuje się do korekty daty.</p> : null}
        <fieldset disabled={busy} className="mt-5 space-y-4">
          <TextField className="block" type="datetime-local" step="0.001" max={paymentDateInput(new Date().toISOString())} label="Nowa data i godzina wpłaty" required value={value} onChange={setValue} />
          <p className="text-xs text-on-surface-muted">Czas w Twojej lokalnej strefie.{nextDate ? ` Strefa dla wybranej daty: UTC${nextDate.slice(-6)}.` : ""}</p>
          <TextArea className="block" label="Powód korekty" required minLength={1} maxLength={1000} rows={3} value={reason} onChange={setReason} />
        </fieldset>
        {needsRefresh ? <Button type="button" variant="secondary" className="mt-4" disabled={busy} onClick={() => void reload()}>Odśwież wpłatę</Button> : null}
        {reviewRequired && !needsRefresh ? <Button type="button" variant="secondary" className="mt-4" disabled={busy} onClick={() => { setReviewRequired(false); setError(""); }}>Sprawdziłem aktualną datę</Button> : null}
      </div>
      <ModalFooter><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Zamknij</Button><Button type="submit" disabled={busy || reviewRequired || needsRefresh || !valid || !canCorrectPaymentDate(current)}>{busy ? "Zapisywanie…" : "Zapisz korektę"}</Button></ModalFooter>
    </form>
  </ModalOverlay>;
}
