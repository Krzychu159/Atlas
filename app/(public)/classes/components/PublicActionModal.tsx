"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import TermsAcceptance from "@/app/components/legal/TermsAcceptance";
import { TextField } from "@/app/components/ui/input";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { ApiError, getErrorMessage } from "@/app/lib/backend";
import { publicErrorMessage } from "@/app/lib/public/errors";
import { resendEmailVerification } from "@/app/lib/email-verification";
import { acceptLegalTerms, getLegalRequirements, type LegalRequirements } from "@/app/lib/legal";
import { authenticatePublicClient, registerPublicClient, bookGroupClass, cancelGroupClassBooking, purchaseGroupPackage, getPublicLocations, type PublicLocation, type PublicGroupClass, type PublicGroupPackage, type GroupPackagePurchase } from "@/app/lib/public/group-classes";
import { ClientPaymentStatus, getTpayErrorMessage, startTpayCheckout, type ClientPaymentDto } from "@/app/lib/payments/tpay";
import { publicMoney, studioDay, studioTime } from "@/app/lib/public/studio-date";

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
  const [registrationLegal, setRegistrationLegal] = useState<LegalRequirements | null>(null);
  const [registrationLegalLoading, setRegistrationLegalLoading] = useState(false);
  const [registrationTermsAccepted, setRegistrationTermsAccepted] = useState(false);
  const [purchaseLegal, setPurchaseLegal] = useState<LegalRequirements | null>(null);
  const [purchaseLegalLoading, setPurchaseLegalLoading] = useState(false);
  const [purchaseTermsAccepted, setPurchaseTermsAccepted] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [purchase, setPurchase] = useState<GroupPackagePurchase | null>(null);
  const [checkout, setCheckout] = useState<ClientPaymentDto | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (!register || action.type !== "auth") return;
    let active = true;
    getPublicLocations().then((items) => { if (active) { setLocations(items); setLocationId((current) => current || String(items[0]?.id || "")); } }).catch((err) => { if (active) setError(modalErrorMessage(err, "Nie udało się wczytać lokalizacji. Spróbuj ponownie za chwilę.")); });
    return () => { active = false; };
  }, [register, action.type]);
  useEffect(() => {
    const selectedLocationId = Number(locationId);

    if (!register || !selectedLocationId) return;

    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setRegistrationLegalLoading(true);
      getLegalRequirements(selectedLocationId)
        .then((requirements) => {
          if (active) setRegistrationLegal(requirements);
        })
        .catch((err) => {
          if (active) {
            setRegistrationLegal(null);
            setError(modalErrorMessage(err, "Nie udało się wczytać regulaminu. Spróbuj ponownie za chwilę."));
          }
        })
        .finally(() => {
          if (active) setRegistrationLegalLoading(false);
        });
      });

    return () => { active = false; };
  }, [register, locationId]);
  useEffect(() => {
    if (action.type !== "buy" || user?.role.toLowerCase() !== "client") return;

    let active = true;
    const packageLocationId = action.item.locationId;
    void Promise.resolve().then(() => {
      if (!active) return;
      setPurchaseLegalLoading(true);
      getLegalRequirements(packageLocationId)
        .then((requirements) => {
          if (active) setPurchaseLegal(requirements);
        })
        .catch((err) => {
          if (active) {
            setPurchaseLegal(null);
            setError(modalErrorMessage(err, "Nie udało się wczytać regulaminu. Spróbuj ponownie za chwilę."));
          }
        })
        .finally(() => {
          if (active) setPurchaseLegalLoading(false);
        });
      });

    return () => { active = false; };
  }, [action, user]);
  const selectedRegistrationLegal =
    registrationLegal?.locationId === Number(locationId)
      ? registrationLegal
      : null;
  async function authenticate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (register && !selectedRegistrationLegal) {
        setError("Nie udało się wczytać regulaminu. Spróbuj ponownie za chwilę.");
        return;
      }
      if (register && selectedRegistrationLegal?.acceptanceRequired && (!selectedRegistrationLegal.termsVersion || (!selectedRegistrationLegal.isAccepted && !registrationTermsAccepted))) {
        setError("Zaakceptuj regulamin, aby utworzyć konto.");
        return;
      }
      const result = register ? await registerPublicClient({
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phone,
        locationId: Number(locationId),
        ...(selectedRegistrationLegal?.acceptanceRequired && selectedRegistrationLegal.termsVersion
          ? { acceptTerms: true as const, termsVersion: selectedRegistrationLegal.termsVersion }
          : {}),
      }) : await authenticatePublicClient({ email, password });
      onUser(result.user);
      dialog.current?.focus();
      if (
        register &&
        (result.emailVerificationRequired || result.emailVerified === false)
      ) {
        setVerificationPending(true);
      } else if (action.type === "auth") onClose();
    } catch (err) { setError(modalErrorMessage(err, register ? "Nie udało się utworzyć konta. Sprawdź podane dane i spróbuj ponownie." : "Nie udało się zalogować. Sprawdź e-mail i hasło, a potem spróbuj ponownie.")); } finally { setBusy(false); }
  }
  async function resendVerification() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await resendEmailVerification(email);
      setResendSent(true);
    } catch (err) { setError(modalErrorMessage(err, "Nie udało się wysłać linku. Spróbuj ponownie za chwilę.")); } finally { setBusy(false); }
  }
  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) onUser(null);
    setError(modalErrorMessage(err, action.type === "buy" ? "Nie udało się kupić pakietu. Spróbuj ponownie za chwilę." : action.type === "cancel" ? "Nie udało się odwołać rezerwacji. Spróbuj ponownie za chwilę." : "Nie udało się zarezerwować miejsca. Spróbuj ponownie za chwilę."));
  }
  async function confirm() {
    if (action.type === "auth" || busy) return;
    setBusy(true); setError("");
    try {
      if (action.type === "buy") {
        if (!purchaseLegal) {
          setError("Nie udało się wczytać regulaminu. Spróbuj ponownie za chwilę.");
          return;
        }
        if (purchaseLegal.acceptanceRequired && !purchaseLegal.isAccepted) {
          if (!purchaseLegal.termsVersion || !purchaseTermsAccepted) {
            setError("Zaakceptuj regulamin, aby kupić pakiet.");
            return;
          }
          await acceptLegalTerms({ locationId: action.item.locationId, acceptTerms: true, termsVersion: purchaseLegal.termsVersion });
          setPurchaseLegal({ ...purchaseLegal, isAccepted: true });
        }
        setPurchase(await purchaseGroupPackage(action.item.id)); dialog.current?.focus(); onRefresh();
      }
      else {
        if (action.type === "book") await bookGroupClass(action.item.id);
        else await cancelGroupClassBooking(action.item.id);
        toast.success(action.type === "book" ? "Miejsce zostało zarezerwowane." : "Rezerwacja została odwołana.");
        onRefresh(); onClose();
      }
    } catch (err) { handleError(err); onRefresh(); } finally { setBusy(false); }
  }
  async function payOnline() {
    if (!purchase || busy || purchase.paymentStatus === "Paid" || checkout?.status === ClientPaymentStatus.Confirmed) return;
    if (checkout?.status === ClientPaymentStatus.PendingConfirmation) {
      if (checkout.checkoutUrl) window.location.assign(checkout.checkoutUrl);
      return;
    }
    setBusy(true); setError("");
    try {
      const payment = await startTpayCheckout(purchase.clientPackageId);
      setCheckout(payment);
      if (payment.status === ClientPaymentStatus.Confirmed) {
        setPurchase({ ...purchase, paymentStatus: "Paid", amountDue: 0 });
        onRefresh();
        return;
      }
      if (payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }
      switch (payment.status) {
        case ClientPaymentStatus.PendingConfirmation:
          break;
        case ClientPaymentStatus.Rejected:
          setError("Płatność nie została przyjęta. Możesz spróbować ponownie.");
          break;
        case ClientPaymentStatus.Cancelled:
          setError("Płatność została anulowana. Możesz spróbować ponownie.");
          break;
        case ClientPaymentStatus.Reversed:
          setError("Płatność została zwrócona. Jeśli potrzebujesz pomocy, skontaktuj się ze studiem.");
          break;
        default:
          setError("Nie udało się przejść do płatności. Spróbuj ponownie za chwilę.");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUser(null);
      setError(modalErrorMessage(err, "Nie udało się rozpocząć płatności online. Spróbuj ponownie za chwilę."));
    } finally { setBusy(false); }
  }
  const isPaid = purchase?.paymentStatus === "Paid" || checkout?.status === ClientPaymentStatus.Confirmed;
  const awaitingPayment = checkout?.status === ClientPaymentStatus.PendingConfirmation && !checkout.checkoutUrl;
  const title = verificationPending ? "Potwierdź adres e-mail" : !user ? (register ? "Utwórz konto" : "Zaloguj się") : purchase ? "Twój pakiet" : action.type === "buy" ? "Kup pakiet" : action.type === "cancel" ? "Odwołać zapis?" : "Zarezerwuj miejsce";
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
      {verificationPending ? <div className="mt-6 space-y-4">
        <p className="text-sm leading-6 text-on-surface-variant">Wysłaliśmy link na <strong className="text-on-surface">{email}</strong>. Kliknij go, aby potwierdzić adres e-mail przed zakupem pakietu lub zapisem na zajęcia.</p>
        {resendSent ? <p role="status" className="rounded-[var(--radius-md)] bg-tertiary-container/30 p-3 text-sm text-tertiary-light">Jeśli Twój adres e-mail nie jest jeszcze potwierdzony, wyślemy Ci nowy link. Sprawdź skrzynkę i folder ze spamem. O kolejny link możesz poprosić za minutę.</p> : null}
        <Button className="w-full" variant="secondary" disabled={busy} onClick={resendVerification}>{busy ? "Wysyłanie…" : "Wyślij link ponownie"}</Button>
        <Button className="w-full" variant="ghost" disabled={busy} onClick={onClose}>Wróć do strony</Button>
      </div> : !user ? <form onSubmit={authenticate} className="mt-5 grid gap-4">
        <p className="text-sm text-on-surface-variant">{action.type === "buy" ? "Zaloguj się lub utwórz konto, aby kupić pakiet." : action.type === "auth" ? "Zaloguj się, aby przejść do swojego konta, lub utwórz nowe konto." : action.type === "cancel" ? "Zaloguj się, aby odwołać rezerwację." : "Zaloguj się lub utwórz konto, aby zapisać się na zajęcia."}</p>
        <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
        <TextField label="Hasło" type="password" autoComplete={register ? "new-password" : "current-password"} value={password} onChange={setPassword} required />
        {register && <><div className="grid gap-4 sm:grid-cols-2"><TextField label="Imię" autoComplete="given-name" value={firstName} onChange={setFirstName} required /><TextField label="Nazwisko" autoComplete="family-name" value={lastName} onChange={setLastName} required /></div><TextField label="Telefon" type="tel" autoComplete="tel" value={phone} onChange={setPhone} required />{action.type === "auth" && <CustomSelect label="Lokalizacja" value={locationId} onChange={(value) => { setLocationId(value); setRegistrationTermsAccepted(false); }} options={locations.map((item) => ({ value: String(item.id), label: item.name }))} />}{registrationLegalLoading || (locationId && !selectedRegistrationLegal) ? <p className="text-xs text-on-surface-muted">Wczytujemy regulamin…</p> : selectedRegistrationLegal?.acceptanceRequired && selectedRegistrationLegal.termsVersion && selectedRegistrationLegal.termsUrl ? <TermsAcceptance id="registration-terms" companyName={selectedRegistrationLegal.legalEntityName} termsVersion={selectedRegistrationLegal.termsVersion} termsUrl={selectedRegistrationLegal.termsUrl} isAccepted={selectedRegistrationLegal.isAccepted} checked={selectedRegistrationLegal.isAccepted || registrationTermsAccepted} onCheckedChange={setRegistrationTermsAccepted} disabled={busy} /> : null}</>}
        <Button type="submit" disabled={busy || (register && (!locationId || registrationLegalLoading || !selectedRegistrationLegal || (selectedRegistrationLegal.acceptanceRequired && !selectedRegistrationLegal.isAccepted && !registrationTermsAccepted)))}>{busy ? "Proszę czekać…" : register ? "Utwórz konto" : "Zaloguj się"}</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => { setRegister(!register); setError(""); }}>{register ? "Mam już konto — zaloguj się" : "Nie masz konta? Zarejestruj się"}</Button>
        {!register && <Link className="text-center text-xs text-primary-light" href="/login">Nie pamiętasz hasła?</Link>}
      </form> : user.role.toLowerCase() !== "client" ? <p className="mt-6 text-sm text-on-surface-variant">Jesteś zalogowany na konto obsługi studia. Aby kupić pakiet lub zapisać się na zajęcia, zaloguj się na swoje konto klienta.</p> : purchase ? <div className="mt-6 space-y-4">
        <h3 className="text-xl font-semibold">{purchase.packageName}</h3>
        <p>{purchase.entriesCount} wejść • {publicMoney(purchase.amountDue, purchase.currency)}</p>
        {isPaid ? <p role="status" className="text-tertiary-light">Pakiet jest opłacony. Możesz teraz zapisać się na zajęcia.</p> : awaitingPayment ? <div className="space-y-4">
          <p role="status" className="rounded-[var(--radius-md)] bg-primary/15 p-4 text-sm leading-6 text-primary-light">Czekamy na potwierdzenie płatności. Gdy pakiet będzie opłacony, możesz zapisać się na zajęcia.</p>
          <Link className="block text-center text-sm font-semibold text-primary-light" href={`/payment-result?paymentId=${checkout.id}`}>Sprawdź płatność</Link>
        </div> : <div className="space-y-4">
          <p className="text-sm leading-6 text-on-surface-variant">Pakiet czeka na opłacenie. Po opłaceniu możesz zapisać się na zajęcia.</p>
          <Button className="w-full" disabled={busy} onClick={payOnline}>{busy ? "Przechodzimy do płatności…" : "Opłać pakiet online"}</Button>
        </div>}
        <p className="text-xs text-on-surface-muted">Pakiet i płatności znajdziesz również w „Moje konto”.</p>
        <Button variant="secondary" className="w-full" onClick={onClose} disabled={busy}>Wróć do zajęć</Button>
      </div> : action.type !== "auth" && <div className="mt-6 space-y-5">
        <h3 className="text-xl font-semibold">{action.type === "buy" ? action.item.name : action.item.title}</h3>
        {action.type === "buy" ? <p className="text-on-surface-variant">{action.item.entriesCount} wejść • {action.item.durationDays} dni • {publicMoney(action.item.price, action.item.currency)}<br />Lokalizacja: {action.item.locationName}<br /><span className="mt-3 block text-sm">Po zakupie opłacisz pakiet online. Gdy płatność zostanie potwierdzona, możesz od razu zapisać się na zajęcia.</span></p> : <p className="text-on-surface-variant">{studioDay(action.item.startAt)}, {studioTime(action.item.startAt)}<br />{action.item.locationName}<span className="mt-3 block text-sm">{action.type === "book" ? "Aby zapisać się na te zajęcia, potrzebujesz opłaconego pakietu grupowego z dostępnymi wejściami w tej lokalizacji." : "Czy chcesz odwołać swoją rezerwację?"}</span></p>}
        {action.type === "buy" && purchaseLegalLoading ? <p className="text-xs text-on-surface-muted">Wczytujemy regulamin…</p> : action.type === "buy" && purchaseLegal?.acceptanceRequired && purchaseLegal.termsVersion && purchaseLegal.termsUrl ? <TermsAcceptance id="purchase-terms" companyName={purchaseLegal.legalEntityName} termsVersion={purchaseLegal.termsVersion} termsUrl={purchaseLegal.termsUrl} isAccepted={purchaseLegal.isAccepted} checked={purchaseLegal.isAccepted || purchaseTermsAccepted} onCheckedChange={setPurchaseTermsAccepted} disabled={busy} /> : null}
        <Button className="w-full" disabled={busy || (action.type === "buy" && (purchaseLegalLoading || !purchaseLegal || (purchaseLegal.acceptanceRequired && !purchaseLegal.isAccepted && !purchaseTermsAccepted)))} onClick={confirm}>{busy ? "Proszę czekać…" : action.type === "buy" ? "Kup pakiet" : action.type === "cancel" ? "Odwołaj zapis" : "Potwierdź zapis"}</Button>
        {action.type === "book" && <Link onClick={onClose} className="block text-center text-sm text-primary-light" href={`/classes?locationId=${action.item.locationId}#packages`}>Nie masz pakietu? Zobacz pakiety</Link>}
      </div>}
    </div>
  </ModalOverlay>;
}

function modalErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 401) {
    return "Zaloguj się ponownie, aby kontynuować.";
  }
  const original = getErrorMessage(error, fallback);
  if (/email.*(?:not verified|verification required|must be verified|not confirmed)/i.test(original)) {
    return "Potwierdź adres e-mail, aby kontynuować. Sprawdź wiadomość od studia w swojej skrzynce.";
  }
  const paymentMessage = getTpayErrorMessage(error, fallback);
  if (paymentMessage !== original) {
    if (/nie są skonfigurowane/.test(paymentMessage)) {
      return "Płatności online są teraz niedostępne w tej lokalizacji. Skontaktuj się ze studiem.";
    }
    if (/istnieje już płatność/.test(paymentMessage)) {
      return "Czekamy na potwierdzenie Twojej płatności. Sprawdź ją w „Moje konto”.";
    }
    if (/nie ma kwoty/.test(paymentMessage)) {
      return "Ten pakiet nie wymaga już dopłaty. Sprawdź go w „Moje konto”.";
    }
    return paymentMessage;
  }
  const publicMessage = publicErrorMessage(error);
  return publicMessage !== original ? publicMessage : fallback;
}
