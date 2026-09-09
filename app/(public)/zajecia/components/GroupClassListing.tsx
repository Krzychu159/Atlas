"use client";

import { useEffect, useState } from "react";
import { MapPin, Info, ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { getErrorMessage } from "@/app/lib/backend";
import { getPublicLocations, getPublicPackages, getPublicGroupClasses, type PublicLocation, type PublicGroupPackage, type PublicGroupClass } from "@/app/lib/public/group-classes";
import { addStudioDays, studioToday, studioFormat } from "@/app/lib/public/studio-date";
import { usePublicContext } from "./PublicShell";
import { EmptyClasses, GroupClassCard, PackageList, PublicError, PublicLoading } from "./GroupCards";

export default function GroupClassListing() {
  const { revision, authReady } = usePublicContext();
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [classes, setClasses] = useState<PublicGroupClass[]>([]);
  const [packages, setPackages] = useState<PublicGroupPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    getPublicLocations().then((items) => {
      if (!active) return;
      const params = new URLSearchParams(window.location.search);
      const requested = Number(params.get("locationId"));
      const requestedDate = params.get("date") || "";
      const currentDay = studioToday();
      setToday(currentDay);
      setDate((value) => value || (/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && !Number.isNaN(Date.parse(requestedDate)) ? requestedDate : currentDay));
      setLocations(items); setLocationsLoaded(true); setError("");
      setLocationId((value) => items.some((item) => item.id === value) ? value : (items.find((item) => item.id === requested)?.id ?? items[0]?.id ?? null));
      if (!items.length) setLoading(false);
    }).catch((err) => { if (active) { setError(getErrorMessage(err)); setLoading(false); } });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    if (!locationId || !date || !authReady) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true); setError(""); setPackageError("");
      const url = new URL(window.location.href); url.searchParams.set("locationId", String(locationId)); url.searchParams.set("date", date); window.history.replaceState(null, "", url);
      Promise.allSettled([getPublicGroupClasses({ locationId, from: `${date}T00:00:00`, to: `${date}T23:59:59` }), getPublicPackages(locationId)]).then(([sessionsResult, packagesResult]) => {
        if (!active) return;
        if (sessionsResult.status === "fulfilled") setClasses(sessionsResult.value.slice().sort((a, b) => a.startAt.localeCompare(b.startAt)));
        else { setClasses([]); setError(getErrorMessage(sessionsResult.reason)); }
        if (packagesResult.status === "fulfilled") setPackages(packagesResult.value);
        else { setPackages([]); setPackageError(getErrorMessage(packagesResult.reason)); }
        setLoading(false);
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [locationId, date, revision, authReady, retry]);
  const location = locations.find((item) => item.id === locationId);
  return <>
    <div className="mb-7 sm:mb-9"><p className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-light"><span className="h-1.5 w-1.5 rounded-full bg-primary-light" />Grafik na żywo</p><h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">Znajdź zajęcia dla siebie</h1><p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant sm:text-base">Wybierz lokalizację, sprawdź dostępne terminy i zarezerwuj miejsce.</p></div>
    <section id="lokalizacje" className="mb-8 flex flex-wrap items-center justify-between gap-5 rounded-[var(--radius-xl)] bg-surface-container-low p-4 sm:mb-9 sm:p-6"><div className="min-w-0 w-full sm:w-auto"><p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Wybierz studio</p><div className="flex flex-wrap gap-1 rounded-[var(--radius-lg)] sm:bg-surface-container-lowest sm:p-1">{locations.map((item) => <Button key={item.id} size="sm" variant={item.id === locationId ? "primary" : "ghost"} aria-pressed={item.id === locationId} onClick={() => { if (item.id !== locationId) { setLoading(true); setLocationId(item.id); } }} className="min-h-11 rounded-full sm:rounded-[var(--radius-md)]">{item.id === locationId && <MapPin size={14} />}{item.name}</Button>)}</div></div>{location?.address && <p className="hidden max-w-xs text-sm text-on-surface-variant sm:block"><span className="block text-xs">Wybrana lokalizacja:</span><strong>{location.name}</strong> • {location.address}</p>}{locationsLoaded && !locations.length && <p className="text-sm text-on-surface-variant">Nie ma jeszcze lokalizacji z publicznymi zajęciami.</p>}</section>
    <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_310px]">
      <section className="min-w-0"><h2 className="mb-4 font-display text-xl font-bold">Najbliższe zajęcia</h2><div className="mb-5 flex max-w-full gap-2 overflow-x-auto pb-2">{today && Array.from({ length: 5 }, (_, index) => addStudioDays(today, index)).map((day, index) => <button key={day} onClick={() => { if (day !== date) { setLoading(true); setDate(day); } }} aria-pressed={date === day} className={`min-h-14 min-w-20 shrink-0 rounded-[var(--radius-lg)] px-3 py-2 text-xs ${date === day ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant"}`}><span className="block text-[10px]">{index === 0 ? "Dzisiaj" : index === 1 ? "Jutro" : studioFormat(day, { weekday: "short" })}</span><span className="mt-1 block font-semibold">{studioFormat(day, { day: "numeric", month: "short" })}</span></button>)}</div>
        <label className="mb-5 block max-w-52"><span className="mb-2 block text-xs text-on-surface-variant">Inny termin</span><Input aria-label="Wybierz datę zajęć" type="date" value={date} onChange={(event) => { if (event.target.value) { setLoading(true); setDate(event.target.value); } }} /></label>
        {loading ? <PublicLoading /> : error ? <PublicError message={error} retry={() => setRetry((value) => value + 1)} /> : classes.length ? <div className="space-y-4">{classes.map((item) => <GroupClassCard key={item.id} item={item} />)}</div> : <EmptyClasses />}
        {classes.length === 50 && !loading && <p className="mt-3 text-xs text-on-surface-muted">Wyświetlono maksymalnie 50 zajęć w wybranym dniu.</p>}
        <a href="#pakiety" className="mt-6 flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface-container p-5"><Info className="shrink-0 text-primary-light" size={22} /><div className="flex-1"><h3 className="text-sm font-semibold">Nie masz jeszcze wejściówki?</h3><p className="mt-1 text-xs text-on-surface-variant">Do zapisu potrzebujesz opłaconego pakietu.</p></div><ArrowRight size={17} className="text-primary-light" /></a>
      </section>
      <aside className="min-w-0">{loading ? <PublicLoading /> : packageError ? <PublicError message={packageError} retry={() => setRetry((value) => value + 1)} /> : <PackageList items={packages} />}</aside>
    </div>
  </>;
}
