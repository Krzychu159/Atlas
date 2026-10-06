"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { getErrorMessage } from "@/app/lib/backend";
import { formatDateTime } from "@/app/lib/formatters/date";
import { getClientAudit, type ClientAuditDto, type ClientAuditResponse } from "@/app/lib/owner/clients";
import { getPackageClosureLabel, getPackageOriginLabel, getPackagePaymentStatusLabel } from "@/app/lib/owner/billing";
import { userMessage, userTrainingType } from "@/app/lib/user-messages";

const actionLabels: Record<string, string> = {
  ProfileUpdated: "Zmieniono profil klienta", Archived: "Zarchiwizowano klienta",
  Restored: "Przywrócono klienta", TrainerChanged: "Zmieniono trenera opiekuna",
  PortalBlocked: "Zablokowano dostęp do panelu", PortalUnblocked: "Przywrócono dostęp do panelu",
  LocationAccessChanged: "Zmieniono dostęp do lokalizacji", LocationMembershipRemoved: "Usunięto przypisanie do lokalizacji",
  CooperationClosed: "Zakończono współpracę", PackageCorrected: "Skorygowano pakiet",
  PackageClosed: "Zamknięto pakiet", PackageReplaced: "Zmieniono pakiet",
  RefundConfirmedExternally: "Potwierdzono wykonany zwrot", RetainedPackageResumed: "Wznowiono zachowany pakiet",
  LoginEmailChangeApproved: "Zaakceptowano zmianę adresu do logowania",
  LoginEmailChangeRejected: "Odrzucono zmianę adresu do logowania", LoginEmailChanged: "Zmieniono adres do logowania",
};

const fieldLabels: Record<string, string> = {
  firstname: "Imię", lastname: "Nazwisko", fullname: "Imię i nazwisko", email: "E-mail",
  loginemail: "Adres do logowania", phonenumber: "Telefon", goal: "Cel", notes: "Notatki",
  trainerid: "Trener (numer)", trainername: "Trener", trainerfullname: "Trener",
  locationid: "Lokalizacja (numer)", locationname: "Lokalizacja", locationids: "Lokalizacje",
  isarchived: "Archiwum", portalaccessstatus: "Dostęp do panelu", isactive: "Aktywność pakietu",
  name: "Nazwa", packagename: "Pakiet", totalsessions: "Wszystkie wejścia", usedsessions: "Wykorzystane wejścia",
  remainingsessions: "Pozostałe wejścia", totalprice: "Cena", amountpaid: "Opłacono", amountdue: "Do zapłaty",
  currentbalance: "Saldo", balance: "Saldo", balanceapplied: "Wykorzystane saldo",
  purchasedate: "Data zakupu", validuntil: "Ważny do", paymentduedate: "Termin płatności",
  paymentstatus: "Płatność", closuredisposition: "Rozliczenie zamknięcia", closurereason: "Powód zamknięcia",
  closedat: "Data zamknięcia", refundamount: "Kwota zwrotu", refundconfirmedat: "Zwrot potwierdzony",
  refundreference: "Potwierdzenie zwrotu", origin: "Pochodzenie pakietu", activationmode: "Aktywacja",
  autorenewenabled: "Automatyczne przedłużanie", cancelrenewalrequested: "Wyłączenie przedłużania",
  expectedbillingtype: "Typ treningu", currency: "Waluta", reason: "Powód",
  debtdisposition: "Pozostała należność", fundsdisposition: "Wpłacone środki", settlementamount: "Kwota rozliczenia",
};

export default function ClientAuditSection({ clientId, revision = 0 }: { clientId: number; revision?: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<ClientAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      getClientAudit(clientId, page, pageSize).then((result) => {
        if (!cancelled) setData(result);
      }).catch((err) => {
        if (!cancelled) { setData(null); setError(getErrorMessage(err, "Nie udało się pobrać historii zmian.")); }
      }).finally(() => { if (!cancelled) setLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [clientId, page, pageSize, revision, retry]);

  return <section className="card-shell min-w-0 p-5 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-section-title">Historia zmian</h2>
      <label className="text-sm text-on-surface-variant">Na stronie <select className="ml-2 rounded-lg bg-surface-container-lowest p-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
    </div>
    {loading ? <p className="mt-4 text-sm" role="status">Pobieranie historii zmian…</p> : error ? <div className="mt-4"><p role="alert" className="text-sm text-error-light">{error}</p><Button variant="secondary" className="mt-3" onClick={() => setRetry((value) => value + 1)}>Spróbuj ponownie</Button></div> : <>
      <div className="mt-4 space-y-3">{data?.items?.length ? data.items.map((entry) => <AuditEntry key={entry.id} entry={entry} />) : <p className="text-sm text-on-surface-muted">Brak zmian do wyświetlenia.</p>}</div>
      {data && data.totalCount > 0 ? <PaymentPagination page={data.page} pageSize={data.pageSize} totalItems={data.totalCount} onPageChange={setPage} /> : null}
    </>}
  </section>;
}

function AuditEntry({ entry }: { entry: ClientAuditDto }) {
  const before = parseSnapshot(entry.beforeJson);
  const after = parseSnapshot(entry.afterJson);
  const differences = snapshotDifferences(before, after);
  const label = entry.action.startsWith("PackageOpeningBalance:") ? "Wprowadzono stan początkowy pakietu" : Object.hasOwn(actionLabels, entry.action) ? actionLabels[entry.action] : "Zmiana danych klienta";
  return <article className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{label}</h3><time className="text-xs text-on-surface-muted" dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time></div>
    {entry.actorUserId !== null ? <p className="mt-2 text-xs text-on-surface-muted">Osoba wprowadzająca zmianę: #{entry.actorUserId}</p> : null}
    {entry.reason ? <p className="mt-3 break-words text-sm">Powód: {entry.reason}</p> : null}
    <div className="mt-3 space-y-1 text-sm">{differences.length ? differences.slice(0, 12).map((item) => <p key={item.path} className="break-words"><span className="text-on-surface-muted">{item.label}: </span>{item.before} → {item.after}</p>) : <p className="text-on-surface-muted">Szczegóły tej zmiany są dostępne poniżej.</p>}</div>
    <details className="mt-3 text-sm"><summary className="cursor-pointer text-primary-light">Pokaż szczegóły</summary><p className="mt-3 font-semibold">Przed zmianą</p><pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-surface-container p-3 text-xs">{formatSnapshot(before, entry.beforeJson)}</pre><p className="mt-3 font-semibold">Po zmianie</p><pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-surface-container p-3 text-xs">{formatSnapshot(after, entry.afterJson)}</pre></details>
  </article>;
}

function parseSnapshot(value: string): unknown { try { return JSON.parse(value); } catch { return undefined; } }
function formatSnapshot(value: unknown, raw: string) { return value === undefined ? raw || "Brak danych" : JSON.stringify(value, null, 2); }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

function snapshotDifferences(before: unknown, after: unknown, path = "", depth = 0): { path: string; label: string; before: string; after: string }[] {
  if (depth > 4 || (!isObject(before) && !isObject(after))) return [];
  const first = isObject(before) ? before : {};
  const second = isObject(after) ? after : {};
  return Array.from(new Set([...Object.keys(first), ...Object.keys(second)])).flatMap((key) => {
    const a = first[key], b = second[key];
    if (JSON.stringify(a) === JSON.stringify(b)) return [];
    const nextPath = path ? `${path}.${key}` : key;
    if (isObject(a) || isObject(b)) return snapshotDifferences(a, b, nextPath, depth + 1);
    const normalized = key.toLowerCase();
    const label = Object.hasOwn(fieldLabels, normalized) ? fieldLabels[normalized] : null;
    return label ? [{ path: nextPath, label, before: displayValue(normalized, a), after: displayValue(normalized, b) }] : [];
  });
}

function displayValue(key: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "Brak";
  if (key === "closuredisposition") return getPackageClosureLabel(value) || "Brak";
  if (key === "origin") return getPackageOriginLabel(value) || "Pochodzenie niedostępne";
  if (key === "paymentstatus") return getPackagePaymentStatusLabel(value);
  if (typeof value === "boolean") return value ? "Tak" : "Nie";
  if (typeof value === "number") return value.toLocaleString("pl-PL");
  if (Array.isArray(value)) return `Liczba pozycji: ${value.length}`;
  if (typeof value !== "string") return "Szczegóły poniżej";
  if (/^(purchasedate|validuntil|paymentduedate|closedat|refundconfirmedat)$/.test(key)) return formatDateTime(value);
  if (key === "expectedbillingtype") return userTrainingType(value);
  const choices: Record<string, string> = { Immediately: "Od razu", AfterCurrentPackage: "Po bieżącym pakiecie", KeepDue: "Należność pozostaje", WaiveDue: "Należność umorzona", KeepFunds: "Środki pozostają w pakiecie", Balance: "Środki na saldo", Refund: "Zwrot oczekuje", NoAccount: "Brak konta", Invited: "Zaproszony", Active: "Aktywny", Blocked: "Zablokowany" };
  if (["activationmode", "debtdisposition", "fundsdisposition", "portalaccessstatus"].includes(key)) return Object.hasOwn(choices, value) ? choices[value] : "Szczegóły niedostępne";
  if (["reason", "closurereason"].includes(key)) return userMessage(value, "Powód dostępny w szczegółach");
  return value;
}
