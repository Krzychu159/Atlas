"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import { ApiError } from "@/app/lib/backend";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import type { Client } from "@/app/lib/owner/clients";
import { getGroupEnrollmentClients, getGroupPackageOptions, groupEnrollmentError, type GroupPackageOptions, type PrepareGroupEnrollmentPayload } from "@/app/lib/owner/group-enrollments";
import { useClientPaymentRevision } from "@/app/lib/session-corrections";
import { getClientDisplayName } from "../client-utils";
import GroupPackageChoices, { type GroupPackageChoice } from "./GroupPackageChoices";

export default function GroupEnrollmentDraft({ sessionId, sessionStartAt, locationId, disabled, onPrepare, onClose }: {
  sessionId: number; sessionStartAt: string; locationId: number | null; disabled: boolean;
  onPrepare: (payload: PrepareGroupEnrollmentPayload, names?: { clientName: string; packageName: string }) => Promise<void>; onClose: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [choosingClient, setChoosingClient] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const [options, setOptions] = useState<GroupPackageOptions | null>(null);
  const [loadedOptionsKey, setLoadedOptionsKey] = useState("");
  const [choice, setChoice] = useState<GroupPackageChoice | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsPending, setClientsPending] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [clientsError, setClientsError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [clientsRetry, setClientsRetry] = useState(0);
  const [packagesRetry, setPackagesRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const alive = useRef(true);
  const lock = useRef(false);
  const paymentRevision = useClientPaymentRevision(client?.id);
  const clientId = client?.id;
  const query = search.trim();
  const hasLocation = locationId !== null && Number.isSafeInteger(locationId) && locationId > 0;
  const optionsKey = `${sessionId}:${locationId}:${clientId}:${sessionStartAt}:${paymentRevision}:${packagesRetry}`;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (!choosingClient || !hasLocation || locationId === null) { setClientsLoading(false); setClientsPending(false); return; }
    const controller = new AbortController();
    setClientsPending(true); setClientsError("");
    const timer = setTimeout(() => {
      setClientsLoading(true);
      void getGroupEnrollmentClients(locationId, query, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result)) throw new Error("Lista klientów jest niedostępna.");
        setClients(result); setVisibleCount(6);
      }).catch(err => { if (!controller.signal.aborted) { setClients([]); setClientsError(groupEnrollmentError(err)); } })
        .finally(() => { if (!controller.signal.aborted) { setClientsLoading(false); setClientsPending(false); } });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [choosingClient, hasLocation, locationId, query, clientsRetry]);

  useEffect(() => {
    if (!clientId || !hasLocation) return;
    const controller = new AbortController();
    setOptionsError(""); setOptionsLoading(true);
    void getGroupPackageOptions(sessionId, clientId, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (result.sessionId !== sessionId || result.clientId !== clientId || result.locationId !== locationId || !Array.isArray(result.offers) || !Array.isArray(result.ownedPackages)) throw new Error("Nie udało się sprawdzić pakietów dla tych zajęć.");
      setOptions(result); setLoadedOptionsKey(optionsKey);
      setChoice(current => {
        const pkg = current?.kind === "owned" ? result.ownedPackages.find(item => item.clientPackageId === current.id) : current?.kind === "offer" ? result.offers.find(item => item.packageId === current.id) : undefined;
        return pkg?.canSelect === true ? current : null;
      });
    }).catch(err => { if (!controller.signal.aborted) { setOptionsError(err instanceof ApiError && err.status === 404 ? "Wybór pakietów jest chwilowo niedostępny. Spróbuj ponownie później." : groupEnrollmentError(err)); setLoadedOptionsKey(""); } })
      .finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    return () => controller.abort();
  }, [clientId, hasLocation, locationId, sessionId, optionsKey]);

  const displayOptions = options && options.clientId === clientId && options.sessionId === sessionId && options.locationId === locationId ? options : null;
  const optionsCurrent = loadedOptionsKey === optionsKey;
  const selected = choice?.kind === "owned" ? displayOptions?.ownedPackages.find(pkg => pkg.clientPackageId === choice.id) : choice?.kind === "offer" ? displayOptions?.offers.find(pkg => pkg.packageId === choice.id) : undefined;
  const selectPackage = useCallback((next: GroupPackageChoice) => { setChoice(next); setActionError(""); }, []);

  function chooseClient(item: Client) {
    if (item.id !== clientId) { setClient(item); setChoice(null); setOptions(null); setLoadedOptionsKey(""); setOptionsError(""); }
    setChoosingClient(false); setActionError("");
  }
  async function submit() {
    if (lock.current || disabled || !client || !selected || selected.canSelect !== true || !choice || !optionsCurrent || optionsLoading || choosingClient) return;
    lock.current = true; setSubmitting(true); setActionError("");
    try {
      await onPrepare({ clientId: client.id, packageId: selected.packageId, ...(choice.kind === "owned" ? { clientPackageId: choice.id } : {}) }, { clientName: getClientDisplayName(client), packageName: selected.name || "Pakiet klienta" });
    } catch (err) {
      if (alive.current) { setActionError(groupEnrollmentError(err)); setPackagesRetry(value => value + 1); }
    } finally { lock.current = false; if (alive.current) setSubmitting(false); }
  }
  const formDisabled = disabled || submitting;
  return <section aria-label="Dodaj uczestnika" className="min-w-0 space-y-3" onKeyDown={event => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault(); }}>
    <div className="flex items-center justify-between gap-3"><p className="text-label text-on-surface-muted">Wybierz klienta i pakiet</p><Button type="button" variant="ghost" size="sm" disabled={formDisabled} onClick={onClose}>Anuluj</Button></div>
    {!hasLocation ? <p role="alert" className="text-sm text-error-light">Ustal lokalizację zajęć przed wyborem klienta.</p> : null}
    <fieldset disabled={formDisabled || !hasLocation} className="min-w-0 space-y-3">
      {choosingClient ? <div>
        <TextField label="Klient" value={search} onChange={setSearch} icon={<Search size={15} />} placeholder="Imię, nazwisko lub e-mail" />
        <div role="status" className="flex min-h-7 items-center text-xs text-on-surface-muted">{clientsPending || clientsLoading ? "Wyszukiwanie klientów…" : clientsError || (!clients.length ? query ? "Brak pasujących klientów." : "Brak klientów z dostępem grupowym w tej lokalizacji." : `${clients.length} klientów`)}</div>
        {clientsError ? <Button type="button" variant="secondary" size="sm" onClick={() => setClientsRetry(value => value + 1)}>Ponów wyszukiwanie</Button> : null}
        <ul aria-label="Wybierz klienta" aria-busy={clientsPending || clientsLoading} className="space-y-1">{clients.slice(0, visibleCount).map(item => <li key={item.id}>
          <button type="button" aria-pressed={item.id === clientId} disabled={clientsPending || clientsLoading} onClick={() => chooseClient(item)} className="flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-md)] bg-surface-container px-3 py-2 text-left text-sm hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60">
            <span title={getClientDisplayName(item)} className="min-w-0 flex-1 truncate font-semibold">{getClientDisplayName(item)}</span>{item.email ? <span className="hidden min-w-0 max-w-[45%] truncate text-xs text-on-surface-muted sm:block">{item.email}</span> : null}{item.id === clientId ? <Check size={15} aria-label="Wybrany" className="shrink-0 text-primary-light" /> : null}
          </button>
        </li>)}</ul>
        {clients.length > visibleCount ? <Button type="button" variant="ghost" size="sm" disabled={clientsPending || clientsLoading} onClick={() => setVisibleCount(value => value + 6)}>Pokaż kolejnych klientów</Button> : null}
        {client ? <Button type="button" variant="ghost" size="sm" onClick={() => setChoosingClient(false)}>Zachowaj obecny wybór</Button> : null}
      </div> : client ? <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] bg-surface-container px-3 py-2"><Check size={15} className="shrink-0 text-primary-light" /><p className="min-w-0 flex-1 truncate text-sm font-semibold">{getClientDisplayName(client)}</p><Button type="button" variant="ghost" size="sm" onClick={() => setChoosingClient(true)}>Zmień klienta</Button></div> : null}
      {client && !choosingClient ? <div aria-busy={optionsLoading} className="min-h-7">
        <p role="status" className="min-h-5 text-xs text-on-surface-muted">{optionsLoading ? "Sprawdzanie pakietów…" : ""}</p>
        {optionsError ? <div role="alert" className="space-y-2"><p className="text-sm text-error-light">{optionsError}</p><Button type="button" variant="secondary" size="sm" onClick={() => setPackagesRetry(value => value + 1)}>Sprawdź pakiety ponownie</Button></div> : null}
        {optionsLoading && !displayOptions ? <div aria-hidden="true" className="grid gap-2 sm:grid-cols-2"><div className="h-24 rounded-[var(--radius-lg)] bg-surface-container motion-safe:animate-pulse" /><div className="h-24 rounded-[var(--radius-lg)] bg-surface-container motion-safe:animate-pulse" /></div> : null}
        {displayOptions ? <GroupPackageChoices options={displayOptions} choice={choice} disabled={formDisabled || !optionsCurrent || optionsLoading || choosingClient} onSelect={selectPackage} /> : null}
      </div> : null}
    </fieldset>
    {actionError ? <p role="alert" className="text-sm text-error-light">{actionError}</p> : null}
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="min-w-0 break-words text-xs text-on-surface-variant">{selected ? `${choice?.kind === "owned" ? "Posiadany pakiet" : "Oferta pakietu"}: ${selected.name || "Wybrany pakiet"}` : "Wybierz pakiet, aby przygotować zapis."}</p>
      <Button type="button" size="sm" disabled={formDisabled || !hasLocation || !selected || selected.canSelect !== true || !optionsCurrent || optionsLoading || choosingClient} onClick={() => void submit()}>{submitting ? "Przygotowywanie…" : "Przygotuj zapis"}</Button>
    </div>
  </section>;
}
