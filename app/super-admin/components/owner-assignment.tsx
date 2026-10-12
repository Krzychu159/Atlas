"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input, TextArea } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import type { Organization } from "@/app/lib/super-admin/organizations";
import { assignOwner, canAssignOwner, canSelectAccount, searchAccounts, validAccountQuery, validOwnerReason, userManagementMessage, type Account } from "@/app/lib/super-admin/organization-users";
import { useOrganizationResource } from "./use-organization-resource";
import { UsersError, UsersLoading, UsersPagination } from "./user-list-states";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { ApiError } from "@/app/lib/backend";

export function AccountResults({ query, selected, choose }: { query: string; selected: Account | null; choose: (account: Account | null) => void }) {
  const [page, setPage] = useState(1);
  const load = useCallback((signal: AbortSignal) => searchAccounts(query, page, signal), [query, page]);
  const { data, error, loading, retry } = useOrganizationResource(`accounts:${query}:${page}`, load);
  if (loading) return <UsersLoading />;
  if (error) return <UsersError error={error} retry={retry} />;
  if (!data) return null;
  return <div>
    {!data.items.length ? <p role="status" className="rounded-xl bg-[#121416] p-5 text-sm text-on-surface-muted">Nie znaleziono pasujących kont.</p> : <ul className="space-y-2">{data.items.map(account => <li key={account.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#121416] p-4">
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]"><p className="break-words text-sm font-medium">{account.fullName || account.email}</p><p className="break-all text-xs text-on-surface-variant">{account.email}</p><p className="mt-2 text-xs text-on-surface-muted">{account.accountStatus === "Active" ? "Konto aktywne" : "Konto nieaktywne"} · {account.emailVerified ? "E-mail potwierdzony" : "E-mail niepotwierdzony"}</p></div>
      <Button type="button" size="sm" variant="secondary" aria-pressed={selected?.userId === account.userId} disabled={!canSelectAccount(account)} onClick={() => choose(account)}> {selected?.userId === account.userId ? "Wybrane" : "Wybierz konto"}</Button>
    </li>)}</ul>}
    <UsersPagination page={page} totalPages={data.totalPages} label="Strony wyszukiwania kont" change={next => { choose(null); setPage(next); }} />
  </div>;
}

export function OwnerAssignment({ organization, changed }: { organization: Organization; changed: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Account | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useUnsavedChanges(Boolean(selected || reason) && !blocked, busy);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);
  if (!canAssignOwner(organization)) return <p className="text-sm leading-6 text-on-surface-muted">Przypisywanie właściciela jest dostępne wyłącznie dla szkicu organizacji z aktualnymi danymi. Kadra dotychczasowych organizacji pozostaje bez zmian.</p>;

  async function submit() {
    if (lock.current || blocked || !selected || !canSelectAccount(selected) || !validOwnerReason(reason)) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await assignOwner(organization, selected, reason);
      if (!mounted.current) return;
      setBlocked(true);
      changed("Właściciel został przypisany do organizacji. Przypisanie nie aktywuje dostępu do CRM.");
    } catch (error) {
      if (!mounted.current) return;
      const explanation = userManagementMessage(error);
      setMessage(explanation);
      if (error instanceof ApiError && error.status === 400) return;
      // Every failed or ambiguous mutation requires fresh data and confirmation.
      setBlocked(true);
      changed(explanation);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <div className="space-y-5">
    <h3 className="text-lg font-semibold">Przypisz właściciela</h3>
    <p className="text-sm leading-6 text-on-surface-variant">Wybierz istniejące konto z aktywnym statusem i potwierdzonym e-mailem. </p>
    {message && <p role="alert" className="text-sm text-error-light">{message}</p>}
    <fieldset disabled={busy || blocked} className="space-y-5">
      <label className="block text-xs text-on-surface-muted">Szukaj konta<Input className="mt-2" type="search" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setSelected(null); }} aria-describedby="owner-query-note" /></label>
      <p id="owner-query-note" className="text-xs text-on-surface-muted">Wpisz od 3 do 100 znaków imienia, nazwiska lub e-maila.</p>
      {validAccountQuery(query) && query.trim() === debounced ? <AccountResults key={debounced} query={debounced} selected={selected} choose={setSelected} /> : validAccountQuery(query) ? <p role="status" className="text-xs text-on-surface-muted">Przygotowujemy wyszukiwanie…</p> : null}
      {selected && <div className="space-y-4 rounded-xl bg-[#121416] p-5">
        <div className="text-sm leading-6 [overflow-wrap:anywhere]"><p>Organizacja: <strong className="break-words">{organization.name}</strong></p><p>Wybrane konto: <strong className="break-words">{selected.fullName || selected.email}</strong></p><p className="break-all text-on-surface-variant">{selected.email} · ID: {selected.userId}</p></div>
        <TextArea label="Powód przypisania (wymagany)" value={reason} onChange={setReason} maxLength={1000} required aria-describedby="owner-reason-note" />
        <p id="owner-reason-note" className="text-xs text-on-surface-muted">Powód musi mieć od 1 do 1000 znaków i nie może zawierać wyłącznie spacji.</p>
        <p className="text-sm leading-6 text-on-surface-variant">Potwierdzasz przypisanie tego konta jako właściciela tej organizacji. Organizacja pozostanie szkicem bez aktywnego dostępu do CRM.</p>
        <Button type="button" className="h-auto min-h-12 max-w-full whitespace-normal py-3" disabled={busy || blocked || !validOwnerReason(reason)} onClick={() => void submit()}>{busy ? "Przypisywanie…" : "Potwierdź przypisanie właściciela"}</Button>
      </div>}
    </fieldset>
  </div>;
}
