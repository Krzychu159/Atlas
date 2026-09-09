"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Link2, MapPin, TextAlignStart, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { ApiError } from "@/app/lib/backend";
import { publicErrorMessage } from "@/app/lib/public/errors";
import { getPublicGroupClassBySlug, getPublicGroupClasses, getPublicPackages, getPublicLocations, type PublicGroupClass, type PublicGroupPackage, type PublicLocation } from "@/app/lib/public/group-classes";
import { addStudioDays, durationMinutes, studioDay, studioTime, studioToday } from "@/app/lib/public/studio-date";
import { AvailabilityBadge, BookingButton, GroupClassCard, PackageList, PublicError, PublicLoading, TrainerIdentity } from "./GroupCards";
import { usePublicContext } from "./PublicShell";

export default function GroupClassDetails({ slug }: { slug: string }) {
  const { revision, authReady } = usePublicContext();
  const [item, setItem] = useState<PublicGroupClass | null>(null);
  const [packages, setPackages] = useState<PublicGroupPackage[]>([]);
  const [related, setRelated] = useState<PublicGroupClass[]>([]);
  const [location, setLocation] = useState<PublicLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extraError, setExtraError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true); setError(""); setExtraError("");
      try {
        const session = await getPublicGroupClassBySlug(slug);
        if (!active) return;
        const results = await Promise.allSettled([
          getPublicPackages(session.locationId), getPublicLocations(),
          getPublicGroupClasses({ locationId: session.locationId, from: `${studioToday()}T00:00:00`, to: `${addStudioDays(studioToday(), 14)}T23:59:59` }),
        ]);
        if (!active) return;
        setItem(session);
        setPackages(results[0].status === "fulfilled" ? results[0].value : []);
        setLocation(results[1].status === "fulfilled" ? results[1].value.find((entry) => entry.id === session.locationId) ?? null : null);
        setRelated(results[2].status === "fulfilled" ? results[2].value.filter((entry) => entry.id !== session.id).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 2) : []);
        if (results.some((result) => result.status === "rejected")) setExtraError("Nie udało się pobrać części dodatkowych informacji. Spróbuj ponownie.");
      } catch (err) { if (active) setError(err instanceof ApiError && err.status === 404 ? "Nie znaleziono tych zajęć. Wróć do grafiku i wybierz inny termin." : publicErrorMessage(err)); }
      finally { if (active) setLoading(false); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [slug, revision, authReady, retry]);
  return <>
    <Link href={item ? `/classes?locationId=${item.locationId}` : "/classes"} className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm text-primary-light"><ArrowLeft size={17} />Wróć do grafiku</Link>
    {loading ? <PublicLoading /> : error ? <PublicError message={error} retry={() => setRetry((value) => value + 1)} /> : item && <>
      <p className="mb-6 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant"><MapPin size={14} />Lokalizacja: {item.locationName}<span>•</span>{studioDay(item.startAt)}</p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6"><section className="rounded-[var(--radius-xl)] bg-surface-container-low bg-linear-to-br from-transparent to-primary/10 p-5 sm:p-8"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-surface-container px-3 py-1 text-xs">Zajęcia grupowe</span><AvailabilityBadge item={item} /></div><h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">{item.title}</h1><div className="mt-4 flex flex-wrap gap-4 text-sm"><p className="flex items-center gap-2"><Clock3 size={17} className="text-primary-light" />{studioTime(item.startAt)}–{studioTime(item.endAt)} ({durationMinutes(item.startAt, item.endAt)} minut)</p><p className="flex items-center gap-2"><CalendarDays size={17} className="text-primary-light" />{studioDay(item.startAt)}</p></div><div className="mt-7 rounded-[var(--radius-xl)] bg-surface-container-lowest/70 p-5"><TrainerIdentity name={item.trainerFullName} /></div></section>
          <section className="rounded-[var(--radius-xl)] bg-surface-container-low p-5 sm:p-8"><h2 className="flex items-center gap-3 text-xl font-semibold"><TextAlignStart className="text-primary-light" size={20} />O zajęciach</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-on-surface-variant sm:text-base">{item.note || "Opis zajęć nie został jeszcze udostępniony przez studio."}</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-[var(--radius-lg)] bg-surface-container p-4 text-center"><Users className="mx-auto mb-3 text-primary-light" size={21} /><strong>Max {item.capacity} osób</strong><p className="mt-1 text-xs text-on-surface-variant">Wielkość grupy</p></div><div className="rounded-[var(--radius-lg)] bg-surface-container p-4 text-center"><Clock3 className="mx-auto mb-3 text-primary-light" size={21} /><strong>{durationMinutes(item.startAt, item.endAt)} minut</strong><p className="mt-1 text-xs text-on-surface-variant">Czas zajęć</p></div></div></section>
          <section className="rounded-[var(--radius-xl)] bg-surface-container-low p-6"><h2 className="flex items-center gap-2 font-semibold"><MapPin size={19} className="text-primary-light" />Lokalizacja studia</h2><p className="mt-4 text-sm">{item.locationName}</p>{location?.address && <p className="mt-2 text-sm text-on-surface-variant">{location.address}</p>}</section>
        </div>
        <aside className="min-w-0 space-y-5"><section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container"><div className="h-1 bg-linear-to-r from-primary via-primary-light to-tertiary" /><div className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase text-primary-light">Rezerwacja online</p><h2 className="mt-2 text-2xl font-bold">Zarezerwuj miejsce</h2><div className="mt-5"><AvailabilityBadge item={item} /></div><p className="my-5 rounded-[var(--radius-xl)] bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">Zapis w ramach opłaconego pakietu grupowego dla lokalizacji <strong>{item.locationName}</strong>.</p><BookingButton item={item} large /><div className="mt-6 flex items-center justify-between gap-3"><span className="text-xs text-on-surface-variant">Podziel się z partnerem treningowym</span><Button variant="secondary" size="icon" aria-label="Kopiuj link do zajęć" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); toast.success("Link skopiowany."); } catch { toast.error("Nie udało się skopiować. Skopiuj adres z paska przeglądarki."); } }}><Link2 size={17} /></Button></div></div></section><PackageList items={packages} /></aside>
      </div>
      {extraError && <div className="mt-6"><PublicError message={extraError} retry={() => setRetry((value) => value + 1)} /></div>}
      {related.length > 0 && <section className="mt-16"><p className="text-xs font-semibold uppercase text-primary-light">Sprawdź inne godziny</p><h2 className="mb-6 mt-2 font-display text-2xl font-bold">Najbliższe zajęcia • {item.locationName}</h2><div className="grid gap-4 md:grid-cols-2">{related.map((entry) => <GroupClassCard key={entry.id} item={entry} />)}</div></section>}
    </>}
  </>;
}
