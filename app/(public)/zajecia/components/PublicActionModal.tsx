"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { ApiError, getErrorMessage } from "@/app/lib/backend";
import { authenticatePublicClient, registerPublicClient, bookGroupClass, cancelGroupClassBooking, purchaseGroupPackage, reportGroupPayment, getPublicLocations, type PublicLocation, type PublicGroupClass, type PublicGroupPackage, type GroupPackagePurchase } from "@/app/lib/public/group-classes";
import { publicMoney, studioNow, studioDay, studioTime } from "@/app/lib/public/studio-date";

export type PublicAction = { type: "auth" } | { type: "buy"; item: PublicGroupPackage } | { type: "book" | "cancel"; item: PublicGroupClass };
type User = { userId: number | string; role: string };
export function PublicActionModal({ action, user, onUser, onClose, onRefresh }: {
  action: PublicAction; user: User | null; onUser: (user: User | null) => void; onClose: () => void; onRefresh: () => void;
}) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationId, setLocationId] = useState(action.type === "auth" ? "" : String(action.item.locationId));
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [purchase, setPurchase] = useState<GroupPackagePurchase | null>(null);
  const [paymentSent, setPaymentSent] = useState(false);
  const [method, setMethod] = useState("1");
  const [paymentDate, setPaymentDate] = useState(() => studioNow().slice(0, 16));
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (!register || action.type !== "auth") return;
    let active = true;
    getPublicLocations().then((items) => { if (active) { setLocations(items); setLocationId((current) => current || String(items[0]?.id || "")); } }).catch((err) => { if (active) setError(getErrorMessage(err)); });
    return () => { active = false; };
  }, [register, action.type]);
  async function authenticate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = register ? await registerPublicClient({ email, password, firstName, lastName, phoneNumber: phone, locationId: Number(locationId) }) : await authenticatePublicClient({ email, password });
      onUser(result.user);
      if (action.type === "auth") onClose();
    } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
  }
  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) onUser(null);
    setError(getErrorMessage(err, "Nie udało się wykonać operacji. Spróbuj ponownie."));
  }
  async function confirm() {
    if (action.type === "auth" || busy) return;
    setBusy(true); setError("");
    try {
      if (action.type === "buy") { setPurchase(await purchaseGroupPackage(action.item.id)); onRefresh(); }
      else {
        if (action.type === "book") await bookGroupClass(action.item.id);
        else await cancelGroupClassBooking(action.item.id);
        toast.success(action.type === "book" ? "Miejsce zostało zarezerwowane." : "Zapis został odwołany.");
        onRefresh(); onClose();
      }
    } catch (err) { handleError(err); onRefresh(); } finally { setBusy(false); }
  }
  async function submitPayment(event: FormEvent) {
    event.preventDefault(); if (!purchase || busy) return;
    setBusy(true); setError("");
    try {
      await reportGroupPayment({ clientPackageId: purchase.clientPackageId, amount: purchase.amountDue, method: Number(method), paymentDate: `${paymentDate}:00`, note: "Płatność za pakiet grupowy" });
      setPaymentSent(true); onRefresh();
    } catch (err) { handleError(err); } finally { setBusy(false); }
  }
  const title = !user ? (register ? "Utwórz konto" : "Zaloguj się") : purchase ? "Twój pakiet" : action.type === "buy" ? "Kup pakiet" : action.type === "cancel" ? "Odwołać zapis?" : "Zarezerwuj miejsce";
  return <ModalOverlay onClose={busy ? undefined : onClose}>
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), [tabindex="0"]') || []);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 shadow-ambient outline-none sm:p-7">
      <ModalHeader title={title} eyebrow="ATLAS • zajęcia grupowe" onClose={() => { if (!busy) onClose(); }} />
      {error && <p role="alert" className="mt-4 rounded-[var(--radius-md)] bg-error-container/30 p-3 text-sm text-error-light">{error}</p>}
      {!user ? <form onSubmit={authenticate} className="mt-5 grid gap-4">
        <p className="text-sm text-on-surface-variant">Zaloguj się lub utwórz konto, aby kontynuować {action.type === "buy" ? "zakup pakietu" : "rezerwację"}.</p>
        <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
        <TextField label="Hasło" type="password" autoComplete={register ? "new-password" : "current-password"} value={password} onChange={setPassword} required />
        {register && <><div className="grid gap-4 sm:grid-cols-2"><TextField label="Imię" autoComplete="given-name" value={firstName} onChange={setFirstName} required /><TextField label="Nazwisko" autoComplete="family-name" value={lastName} onChange={setLastName} required /></div><TextField label="Telefon" type="tel" autoComplete="tel" value={phone} onChange={setPhone} required />{action.type === "auth" && <CustomSelect label="Lokalizacja" value={locationId} onChange={setLocationId} options={locations.map((item) => ({ value: String(item.id), label: item.name }))} />}</>}
        <Button type="submit" disabled={busy || (register && !locationId)}>{busy ? "Proszę czekać…" : register ? "Utwórz konto" : "Zaloguj się"}</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => { setRegister(!register); setError(""); }}>{register ? "Mam już konto — zaloguj się" : "Nie masz konta? Zarejestruj się"}</Button>
        {!register && <Link className="text-center text-xs text-primary-light" href="/login">Nie pamiętasz hasła?</Link>}
      </form> : user.role.toLowerCase() !== "client" ? <p className="mt-6 text-sm text-on-surface-variant">Zapisy i zakup pakietów są dostępne dla kont klientów. Jesteś zalogowany na konto obsługi studia.</p> : purchase ? <div className="mt-6 space-y-4">
        <h3 className="text-xl font-semibold">{purchase.packageName}</h3>
        <p>{purchase.entriesCount} wejść • {publicMoney(purchase.amountDue, purchase.currency)}</p>
        {purchase.paymentStatus === "Paid" ? <p className="text-tertiary-light">Pakiet jest opłacony. Możesz teraz zapisać się na zajęcia.</p> : paymentSent ? <p role="status" className="rounded-[var(--radius-md)] bg-primary/15 p-4 text-primary-light">Zgłoszenie płatności wysłane. Zapis będzie możliwy po potwierdzeniu wpłaty przez studio.</p> : <form onSubmit={submitPayment} className="space-y-4">
          <p className="text-sm leading-6 text-on-surface-variant">Pakiet został utworzony i czeka na opłacenie. Ustal sposób wpłaty ze studiem. Jeśli płatność została już wykonana, zgłoś ją poniżej. To nie jest płatność online — zgłoszenie wymaga potwierdzenia.</p>
          <CustomSelect label="Wykonana płatność" value={method} onChange={setMethod} options={[{ value: "1", label: "Blik" }, { value: "2", label: "Przelew" }, { value: "3", label: "Gotówka" }]} />
          <TextField label="Data wpłaty (czas studia)" type="datetime-local" value={paymentDate} onChange={setPaymentDate} required />
          <Button className="w-full" disabled={busy}>{busy ? "Wysyłanie…" : "Zgłoś wykonaną płatność"}</Button>
        </form>}
        <p className="text-xs text-on-surface-muted">Pakiet i płatności znajdziesz również w „Moje konto”.</p>
        <Button variant="secondary" className="w-full" onClick={onClose} disabled={busy}>Wróć do zajęć</Button>
      </div> : action.type !== "auth" && <div className="mt-6 space-y-5">
        <h3 className="text-xl font-semibold">{action.type === "buy" ? action.item.name : action.item.title}</h3>
        {action.type === "buy" ? <p className="text-on-surface-variant">{action.item.entriesCount} wejść • {action.item.durationDays} dni • {publicMoney(action.item.price, action.item.currency)}<br />Lokalizacja: {action.item.locationName}<br /><span className="mt-3 block text-sm">Utworzysz pakiet do opłacenia. Zapis na zajęcia będzie dostępny po potwierdzeniu płatności.</span></p> : <p className="text-on-surface-variant">{studioDay(action.item.startAt)}, {studioTime(action.item.startAt)}<br />{action.item.locationName}<span className="mt-3 block text-sm">{action.type === "book" ? "Do zapisu potrzebujesz opłaconego pakietu grupowego z wolnymi wejściami w tej lokalizacji." : "Potwierdź odwołanie swojej rezerwacji."}</span></p>}
        <Button className="w-full" disabled={busy} onClick={confirm}>{busy ? "Proszę czekać…" : action.type === "buy" ? "Potwierdź zakup" : action.type === "cancel" ? "Odwołaj zapis" : "Potwierdź zapis"}</Button>
        {action.type === "book" && <Link onClick={onClose} className="block text-center text-sm text-primary-light" href={`/zajecia?locationId=${action.item.locationId}#pakiety`}>Nie masz pakietu? Zobacz pakiety</Link>}
      </div>}
    </div>
  </ModalOverlay>;
}
