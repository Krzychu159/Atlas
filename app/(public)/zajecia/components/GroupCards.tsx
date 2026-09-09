"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock3, Info, MapPin, Ticket, Users, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { PublicGroupClass, PublicGroupPackage } from "@/app/lib/public/group-classes";
import { durationMinutes, hasStarted, publicMoney, studioDay, studioTime } from "@/app/lib/public/studio-date";
import { usePublicContext } from "./PublicShell";

export function AvailabilityBadge({ item }: { item: PublicGroupClass }) {
  const booked = item.isBookedByCurrentClient;
  const full = item.isFullyBooked || item.availableSeats <= 0;
  const text = booked ? "Jesteś zapisany" : full ? `Brak miejsc (${item.bookedSeats}/${item.capacity})` : `${item.availableSeats} wolnych miejsc z ${item.capacity}`;
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${booked ? "bg-primary/20 text-primary-light" : full ? "bg-surface-container text-on-surface-muted" : item.availableSeats <= 2 ? "bg-warning-container/35 text-warning-light" : "bg-tertiary-container/25 text-tertiary-light"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{text}</span>;
}
export function BookingButton({ item, large = false }: { item: PublicGroupClass; large?: boolean }) {
  const { act, authReady } = usePublicContext();
  const started = hasStarted(item.startAt);
  const booked = item.isBookedByCurrentClient;
  const full = item.isFullyBooked || item.availableSeats <= 0;
  return <Button size={large ? "lg" : "sm"} className="w-full rounded-full sm:w-auto" variant={booked || full || started ? "secondary" : "primary"} disabled={!authReady || started || (!booked && full)} onClick={() => act({ type: booked ? "cancel" : "book", item })}>
    {started ? "Zapisy zakończone" : booked ? <><X size={14} />Odwołaj zapis</> : full ? "Brak miejsc" : <>Zapisz się{large ? " na te zajęcia" : ""}<ArrowRight size={15} /></>}
  </Button>;
}
export function TrainerIdentity({ name }: { name: string | null }) {
  return <div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-light/40 bg-primary/10 text-xs font-semibold text-primary-light">{(name || "T").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="min-w-0"><p className="hidden text-[10px] text-on-surface-variant sm:block">Trener prowadzący</p><p className="truncate text-xs font-semibold sm:mt-1 sm:text-sm">{name || "Trener zostanie podany"}</p></div></div>;
}
export function GroupClassCard({ item }: { item: PublicGroupClass }) {
  return <article className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low">
    <div className="p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Link className="font-display text-lg font-bold hover:text-primary-light sm:text-2xl" href={`/zajecia/${encodeURIComponent(item.publicSlug)}`}>{item.title}</Link><AvailabilityBadge item={item} /></div><p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm"><Clock3 size={13} className="text-primary-light" />{studioTime(item.startAt)}–{studioTime(item.endAt)} <span className="text-on-surface-variant">({durationMinutes(item.startAt, item.endAt)} min) • {studioDay(item.startAt)}</span></p></div><div className="hidden sm:block"><BookingButton item={item} /></div></div>{item.note && <p className="mt-4 hidden text-sm leading-6 text-on-surface-variant sm:block">{item.note}</p>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest/40 px-4 py-3 sm:px-6"><TrainerIdentity name={item.trainerFullName} /><p className="flex items-center gap-1 text-[11px] text-on-surface-variant"><MapPin size={13} />{item.locationName}</p></div>
    <div className="p-3 pt-2 sm:hidden"><BookingButton item={item} /></div>
  </article>;
}
export function PackageList({ items }: { items: PublicGroupPackage[] }) {
  const { act, authReady } = usePublicContext();
  return <section id="pakiety" className="scroll-mt-6 rounded-[var(--radius-xl)] bg-surface-container-low p-4 sm:p-5"><div className="mb-5 flex items-center gap-3"><span className="rounded-[var(--radius-md)] bg-primary/15 p-3 text-primary-light"><Ticket size={20} /></span><div><h2 className="font-display text-lg font-bold">Pakiety zajęć grupowych</h2><p className="mt-1 text-xs text-on-surface-variant">{items[0] ? `Wejściówki • ${items[0].locationName}` : "Pakiety w wybranej lokalizacji"}</p></div></div>
    <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-[var(--radius-lg)] bg-surface-container p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{item.name}</h3><strong className="shrink-0 text-lg">{publicMoney(item.price, item.currency)}</strong></div><p className="mt-3 text-xs text-on-surface-variant">{item.entriesCount} wejść • {item.durationDays} dni</p>{item.description && <p className="mt-2 text-xs leading-5 text-on-surface-variant">{item.description}</p>}{item.entriesCount > 1 && <p className="mt-2 flex items-center gap-1 text-xs text-tertiary-light"><Check size={13} />{publicMoney(item.price / item.entriesCount, item.currency)} / wejście</p>}<Button disabled={!authReady} onClick={() => act({ type: "buy", item })} variant={item.entriesCount > 1 ? "primary" : "secondary"} className="mt-5 w-full rounded-full" size="sm">{item.entriesCount === 1 ? "Kup wejściówkę" : "Wybierz pakiet"}</Button></article>)}{!items.length && <p className="p-3 text-sm text-on-surface-variant">Brak dostępnych pakietów w tej lokalizacji.</p>}</div>
    <p className="mt-5 flex gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-xs leading-5 text-on-surface-variant"><Info size={16} className="shrink-0 text-primary-light" />Zapis wymaga opłaconego pakietu. Płatność potwierdza studio.</p>
  </section>;
}
export function EmptyClasses() { return <div className="rounded-[var(--radius-xl)] bg-surface-container-low p-10 text-center"><Users className="mx-auto mb-4 text-primary-light" /><h3 className="font-semibold">Brak zajęć w tym terminie</h3><p className="mt-2 text-sm text-on-surface-variant">Wybierz inny dzień lub lokalizację.</p></div>; }
export function PublicLoading() { return <div role="status" aria-label="Ładowanie zajęć" className="space-y-4">{[0, 1, 2].map((key) => <div key={key} className="h-40 animate-pulse rounded-[var(--radius-xl)] bg-surface-container-low" />)}<span className="sr-only">Ładowanie…</span></div>; }
export function PublicError({ message, retry }: { message: string; retry: () => void }) { return <div role="alert" className="rounded-[var(--radius-xl)] bg-error-container/20 p-6"><p className="text-sm text-error-light">{message}</p><Button variant="secondary" className="mt-4" onClick={retry}>Spróbuj ponownie</Button></div>; }
