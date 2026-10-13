"use client";

import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Info, X } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters/money";
import { formatPackageInstant } from "@/app/lib/package-validity";
import { getPackagePaymentStatusLabel } from "@/app/lib/owner/billing";
import { groupPackageReason, type GroupPackageOptions } from "@/app/lib/owner/group-enrollments";

export type GroupPackageChoice = { kind: "owned" | "offer"; id: number };

export function packageMoney(amount: number, currency: string | null) {
  return Number.isFinite(amount) ? currency ? formatMoney(amount, currency) : `${new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} (waluta niepodana)` : "Kwota niedostępna";
}

const GroupPackageChoices = memo(function GroupPackageChoices({ options, choice, disabled, onSelect }: {
  options: GroupPackageOptions; choice: GroupPackageChoice | null; disabled: boolean; onSelect: (choice: GroupPackageChoice) => void;
}) {
  const offerNames = useMemo(() => new Map(options.offers.map(offer => [offer.packageId, offer.name])), [options.offers]);
  return <div className="space-y-3">
    {options.ownedPackages.length ? <section aria-label="Posiadane pakiety">
      <h4 className="mb-2 text-label text-on-surface-muted">Posiadane pakiety</h4>
      <div className="grid gap-2 sm:grid-cols-2">{options.ownedPackages.map(pkg => {
        const name = pkg.name || offerNames.get(pkg.packageId) || "Pakiet klienta";
        return <PackageRow key={pkg.clientPackageId} name={name} selected={choice?.kind === "owned" && choice.id === pkg.clientPackageId} canSelect={pkg.canSelect} disabled={disabled}
          price={pkg.amountDue > 0 ? `Do opłacenia: ${packageMoney(pkg.amountDue, pkg.currency)}` : packageMoney(pkg.price, pkg.currency)}
          status={pkg.canSelect ? getPackagePaymentStatusLabel(pkg.paymentStatus) : "Pakiet niedostępny"}
          entries={`${pkg.availableEntries} dostępnych wejść`} onSelect={() => onSelect({ kind: "owned", id: pkg.clientPackageId })}>
          <Detail label="Cena pakietu" value={packageMoney(pkg.price, pkg.currency)} />
          <Detail label="Pozostało do zapłaty" value={packageMoney(pkg.amountDue, pkg.currency)} />
          <Detail label="Płatność" value={getPackagePaymentStatusLabel(pkg.paymentStatus)} />
          <Detail label="Aktywność" value={pkg.isActive ? "Aktywny" : "Nieaktywny"} />
          <Detail label="Warunki pakietu" value={pkg.isEligible ? "Spełnione" : "Wymagają uzupełnienia"} />
          <Detail label="Ważny do" value={formatPackageInstant(pkg.validUntil)} />
          <Detail label="Wejścia" value={`${pkg.availableEntries} dostępnych · ${pkg.usedEntries}/${pkg.totalEntries} wykorzystanych · ${pkg.reservedEntries} zarezerwowanych`} />
          <PackageReasons reasons={pkg.reasons} />
        </PackageRow>;
      })}</div>
    </section> : null}
    {options.offers.length ? <section aria-label="Oferty pakietów">
      <h4 className="mb-2 text-label text-on-surface-muted">Oferty pakietów</h4>
      <div className="grid gap-2 sm:grid-cols-2">{options.offers.map(offer => <PackageRow key={offer.packageId} name={offer.name || "Oferta bez nazwy"}
        selected={choice?.kind === "offer" && choice.id === offer.packageId} canSelect={offer.canSelect} disabled={disabled}
        price={packageMoney(offer.price, offer.currency)} status={offer.canSelect ? "Oferta pakietu" : "Oferta niedostępna"}
        entries={`${offer.sessionsLimit} wejść · ${offer.durationDays} dni`} onSelect={() => onSelect({ kind: "offer", id: offer.packageId })}>
        <Detail label="Cena całego pakietu" value={packageMoney(offer.price, offer.currency)} />
        <Detail label="Wejścia i ważność" value={`${offer.sessionsLimit} wejść · ${offer.durationDays} dni`} />
        <PackageReasons reasons={offer.reasons} />
      </PackageRow>)}</div>
    </section> : null}
    {!options.ownedPackages.some(pkg => pkg.canSelect === true) && !options.offers.some(pkg => pkg.canSelect === true) ? <p className="text-sm text-on-surface-muted">Brak pakietów dostępnych do wyboru dla tych zajęć.</p> : null}
  </div>;
});

export default GroupPackageChoices;

function PackageRow({ name, selected, canSelect, disabled, price, status, entries, onSelect, children }: {
  name: string; selected: boolean; canSelect: boolean; disabled: boolean; price: string; status: string; entries: string; onSelect: () => void; children: ReactNode;
}) {
  return <article className={`relative flex min-w-0 items-start gap-1 rounded-[var(--radius-lg)] p-2 ${selected ? "bg-primary/10 ring-1 ring-primary-light/35" : "bg-surface-container"}`}>
    <button type="button" aria-pressed={selected} disabled={disabled || canSelect !== true} onClick={onSelect}
      className={`min-w-0 flex-1 rounded-[var(--radius-md)] p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${canSelect ? "text-on-surface" : "text-on-surface-muted"}`}>
      <span className="flex items-start gap-2"><span className="min-w-0 flex-1 break-words text-sm font-semibold">{name}</span>{selected ? <Check size={16} aria-label="Wybrany" className="shrink-0 text-primary-light" /> : null}</span>
      <span className="mt-1 block break-words text-xs font-semibold">{price}</span>
      <span className="mt-1 block text-xs text-on-surface-muted">{entries}</span>
      <span className="mt-1 block text-xs text-on-surface-variant">{selected ? "Wybrany · " : ""}{status}</span>
    </button>
    <PackageInfo name={name}>{children}</PackageInfo>
  </article>;
}

function PackageInfo({ name, children }: { name: string; children: ReactNode }) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = hovered || focused || pinned;
  useEffect(() => {
    if (!pinned) return;
    const dismiss = (event: PointerEvent) => { if (!button.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) { setPinned(false); setFocused(false); setHovered(false); } };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [pinned]);
  function close() { setPinned(false); setHovered(false); setFocused(false); }
  return <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); button.current?.focus(); close(); } }}>
    <button ref={button} type="button" aria-label={`Szczegóły pakietu: ${name}`} aria-expanded={open} aria-controls={id}
      onClick={() => { if (pinned) close(); else setPinned(true); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-light hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
      <Info size={16} />
    </button>
    {open ? <div ref={panel} id={id} role="region" aria-label={`Szczegóły: ${name}`} className="absolute inset-x-0 top-full z-40 mt-1 space-y-2 rounded-[var(--radius-lg)] bg-surface-container-high p-4 shadow-ambient">
      <div className="flex items-start justify-between gap-2"><p className="min-w-0 break-words text-sm font-semibold">{name}</p><button type="button" aria-label="Zamknij szczegóły pakietu" onClick={() => { button.current?.focus(); close(); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><X size={14} /></button></div>
      {children}
    </div> : null}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p className="break-words text-xs text-on-surface-variant"><span className="text-on-surface-muted">{label}: </span>{value}</p>;
}

function PackageReasons({ reasons }: { reasons: string[] | null }) {
  return reasons?.length ? <ul className="space-y-1 text-xs text-on-surface-variant">{reasons.map((reason, index) => <li key={`${reason}:${index}`}>{groupPackageReason(reason)}</li>)}</ul> : null;
}
