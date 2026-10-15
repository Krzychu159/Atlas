"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getOwnerFilterOptions, type OwnerFilterOption } from "@/app/lib/owner/filter-options";
import { useOwnerRead } from "./use-owner-read";

export function OwnerRemoteSelect({ kind, value, onChange, label, locationId, initialName, allowAll = true, className = "" }: {
  kind: "clients" | "trainers"; value: string; onChange: (value: string) => void; label: string;
  locationId?: number | null; initialName?: string; allowAll?: boolean; className?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OwnerFilterOption | null>(null);
  const load = useCallback((signal: AbortSignal) => getOwnerFilterOptions({ search: search.trim(), locationId, limit: 20 }, signal), [search, locationId]);
  const list = useOwnerRead(JSON.stringify([search, locationId]), load, "Nie udało się pobrać dostępnych osób.", 0, 250, open);
  const options = list.data?.[kind] ?? [];
  const chosen = options.find(option => String(option.id) === value) ?? (String(selected?.id) === value ? selected : null);
  const name = value === "all" || !value ? allowAll ? "Wszyscy" : "Wybierz" : chosen?.name ?? initialName ?? `${kind === "clients" ? "Klient" : "Trener"} #${value}`;
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function choose(option: OwnerFilterOption | null) { setSelected(option); onChange(option ? String(option.id) : allowAll ? "all" : ""); setOpen(false); trigger.current?.focus(); }
  return <div ref={root} className={`relative min-w-0 ${className}`} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(current => !current)} className="flex h-12 w-full items-center gap-3 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-3 text-left focus-visible:outline-2 focus-visible:outline-primary-light">
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase text-on-surface-muted">{label}</span><span className="block truncate text-sm font-semibold">{name}</span></span><ChevronDown size={16} />
    </button>
    {open ? <div id={id} role="dialog" aria-label={`Wybierz: ${label}`} className="absolute left-0 top-full z-50 mt-2 w-full min-w-[220px] rounded-[var(--radius-lg)] border border-white/10 bg-surface-container p-2 shadow-ambient">
      <input ref={input} type="search" maxLength={100} aria-label={`Szukaj: ${label}`} placeholder="Imię, nazwisko lub e-mail" value={search} onChange={event => setSearch(event.target.value)} className="h-11 w-full rounded-lg bg-surface-container-lowest px-3 text-sm outline-primary-light" />
      <div className="mt-2 max-h-64 overflow-y-auto">
        {allowAll ? <button type="button" onClick={() => choose(null)} className="block min-h-10 w-full rounded-lg px-3 text-left text-sm hover:bg-surface-container-high">Wszyscy</button> : null}
        {list.loading ? <p role="status" className="p-3 text-sm text-on-surface-muted">Wyszukiwanie…</p> : list.error ? <div role="alert" className="p-3 text-sm"><p>{list.error}</p><button type="button" onClick={list.retry} className="mt-2 text-primary-light">Spróbuj ponownie</button></div> : options.length ? options.map(option => <button key={option.id} type="button" aria-pressed={String(option.id) === value} onClick={() => choose(option)} className="block min-h-10 w-full rounded-lg px-3 text-left text-sm hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary-light">{option.name}</button>) : <p className="p-3 text-sm text-on-surface-muted">Nie znaleziono osób.</p>}
      </div>
    </div> : null}
  </div>;
}
