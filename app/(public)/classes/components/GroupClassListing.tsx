"use client";

import { useEffect, useState } from "react";
import { MapPin, Info, ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { classesForDay } from "@/app/lib/public/class-listing";
import { Input } from "@/app/components/ui/input";
import { publicErrorMessage } from "@/app/lib/public/errors";
import { getPublicLocations, getPublicPackages, getPublicGroupClasses, type PublicLocation, type PublicGroupPackage, type PublicGroupClass } from "@/app/lib/public/group-classes";
import { addStudioDays, studioToday, studioFormat, studioDateKey, studioDay } from "@/app/lib/public/studio-date";
import { usePublicContext } from "./PublicShell";
import { EmptyClasses, GroupClassCard, PackageList, PublicError, PublicLoading } from "./GroupCards";

export default function GroupClassListing() {
  const { revision, authReady } = usePublicContext();
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [classes, setClasses] = useState<PublicGroupClass[]>([]);
  const [packages, setPackages] = useState<PublicGroupPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const requested = Number(params.get("locationId"));
    const requestedDate = params.get("date") || "";
    const currentDay = studioToday();
    void Promise.resolve().then(() => {
      if (!active) return;
      setToday(currentDay);
      const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && !Number.isNaN(Date.parse(requestedDate)) ? requestedDate : currentDay;
      setDate((value) => value || initialDate);
      setRangeStart((value) => value || initialDate);
    });
    getPublicLocations().then((items) => {
      if (!active) return;
      setLocations(items); setLocationsLoaded(true); setError("");
      setLocationId((value) => items.some((item) => item.id === value) ? value : (items.find((item) => item.id === requested)?.id ?? items[0]?.id ?? null));
      if (!items.length) { setLoading(false); setPackagesLoading(false); }
    }).catch((err) => { if (active) { setError(publicErrorMessage(err)); setLoading(false); setPackagesLoading(false); setLocationsLoaded(true); } });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    if (!locationId || !rangeStart || !authReady) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      getPublicGroupClasses({ locationId, from: `${rangeStart}T00:00:00`, to: `${addStudioDays(rangeStart, 6)}T23:59:59` })
        .then((items) => { if (active) setClasses(items); })
        .catch((err) => { if (active) { setClasses([]); setError(publicErrorMessage(err)); } })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [locationId, rangeStart, revision, authReady, retry]);
  useEffect(() => {
    if (!locationId || !authReady) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setPackagesLoading(true); setPackageError("");
      getPublicPackages(locationId).then((items) => { if (active) setPackages(items); })
        .catch((err) => { if (active) { setPackages([]); setPackageError(publicErrorMessage(err)); } })
        .finally(() => { if (active) setPackagesLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [locationId, authReady, retry]);
  useEffect(() => {
    if (!date) return;
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    if (locationId) url.searchParams.set("locationId", String(locationId));
    window.history.replaceState(null, "", url);
  }, [date, locationId]);
  function selectDate(value: string) {
    if (!value || value === date) return;
    const lastLoadedDay = classes.reduce((latest, item) => {
      const day = studioDateKey(item.startAt);
      return day > latest ? day : latest;
    }, "");
    const withinRange = rangeStart && value >= rangeStart && value <= addStudioDays(rangeStart, 6);
    if (!withinRange || (classes.length >= 50 && value >= lastLoadedDay)) {
      if (locationId && authReady) setLoading(true);
      setRangeStart(value);
    }
    setDate(value);
  }
  function selectLocation(value: number) {
    if (value === locationId) return;
    setLoading(true); setPackagesLoading(true);
    setRangeStart(date); setLocationId(value);
  }
  const { selected, upcoming } = date ? classesForDay(classes, date, locationId) : { selected: [], upcoming: [] };
  const location = locations.find((item) => item.id === locationId);
  return <>
    <div className="mb-7 sm:mb-9"><p className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-light"><span className="h-1.5 w-1.5 rounded-full bg-primary-light" />Grafik na żywo</p><h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">Znajdź zajęcia dla siebie</h1><p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant sm:text-base">Wybierz lokalizację, sprawdź dostępne terminy i zarezerwuj miejsce.</p></div>
    <section id="locations" tabIndex={-1} aria-label="Lokalizacja studia" className={`mb-7 scroll-mt-6 rounded-[var(--radius-xl)] bg-surface-container-low p-4 focus:outline-2 focus:outline-primary-light/50 ${locations.length === 1 ? "sm:w-fit sm:max-w-full" : "sm:p-5"}`}>
      {locations.length === 1 ? <div className="flex items-center gap-3"><MapPin size={22} className="shrink-0 text-primary-light" /><div className="min-w-0"><p className="font-semibold break-words">{locations[0].name}</p>{locations[0].address && <p className="mt-1 text-xs text-on-surface-variant break-words">{locations[0].address}</p>}</div></div> : locations.length > 1 ? <>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Wybierz studio</p>
        {locations.length <= 3 ? <div className="flex flex-wrap gap-2">{locations.map((item) => <Button key={item.id} size="sm" variant={item.id === locationId ? "primary" : "ghost"} aria-pressed={item.id === locationId} onClick={() => selectLocation(item.id)} className="min-h-11 max-w-full whitespace-normal rounded-full">{item.id === locationId && <MapPin size={14} className="shrink-0" />}{item.name}</Button>)}</div> : <div className="max-w-sm"><CustomSelect value={String(locationId ?? "")} onChange={(value) => selectLocation(Number(value))} options={locations.map((item) => ({ value: String(item.id), label: item.name }))} /></div>}
        {location?.address && <p className="mt-3 text-xs text-on-surface-variant break-words">{location.address}</p>}
      </> : <p className="text-sm text-on-surface-variant">{locationsLoaded ? "Nie ma jeszcze lokalizacji z publicznymi zajęciami." : "Ładowanie lokalizacji…"}</p>}
    </section>
    <section className="min-w-0" aria-labelledby="class-list-title">
      <h2 id="class-list-title" className="mb-4 font-display text-xl font-bold">Najbliższe zajęcia</h2>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="grid w-full grid-cols-3 gap-2 min-[380px]:grid-cols-5 sm:w-auto">{today && Array.from({ length: 5 }, (_, index) => addStudioDays(today, index)).map((day, index) => <button key={day} onClick={() => selectDate(day)} aria-pressed={date === day} className={`min-h-14 min-w-0 rounded-[var(--radius-lg)] px-2 py-2 text-xs sm:min-w-20 ${date === day ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant"}`}><span className="block text-[10px]">{index === 0 ? "Dzisiaj" : index === 1 ? "Jutro" : studioFormat(day, { weekday: "short" })}</span><span className="mt-1 block font-semibold">{studioFormat(day, { day: "numeric", month: "short" })}</span></button>)}</div>
        <label className="block w-full sm:max-w-52"><span className="mb-2 block text-xs text-on-surface-variant">Wybrany termin</span><Input className="min-w-0 w-full" aria-label="Wybierz datę zajęć" type="date" value={date} onChange={(event) => selectDate(event.target.value)} /></label>
      </div>
      {loading ? <PublicLoading /> : error ? <PublicError message={error} retry={() => setRetry((value) => value + 1)} /> : selected.length ? <div className="space-y-4">{selected.map((item) => <GroupClassCard key={item.id} item={item} />)}</div> : <>
        <EmptyClasses />
        {upcoming.length > 0 && <section className="mt-6" aria-labelledby="upcoming-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><div><h3 id="upcoming-title" className="font-display text-lg font-bold">Najbliższe dostępne zajęcia</h3><p className="mt-2 text-sm text-on-surface-variant">Najbliższe zajęcia: {studioDay(upcoming[0].startAt)}</p></div><Button variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={() => selectDate(studioDateKey(upcoming[0].startAt))}>Przejdź do najbliższego terminu<ArrowRight size={16} /></Button></div>
          <div className="space-y-4">{upcoming.map((item) => <GroupClassCard key={item.id} item={item} />)}</div>
        </section>}
      </>}
      {classes.length >= 50 && !loading && <p className="mt-3 text-xs text-on-surface-muted">Pobrano maksymalnie 50 zajęć w zakresie tygodnia. Wybierz późniejszą datę, aby sprawdzić kolejne terminy.</p>}
      <a href="#packages" onClick={(event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const target = document.getElementById("packages");
        if (!target) return;
        event.preventDefault();
        const url = new URL(window.location.href); url.hash = "packages";
        window.history.replaceState(null, "", url);
        target.focus({ preventScroll: true }); target.scrollIntoView({ behavior: "smooth", block: "start" });
      }} className="mt-6 flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface-container p-5"><Info className="shrink-0 text-primary-light" size={22} /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Nie masz jeszcze wejściówki?</h3><p className="mt-1 text-xs text-on-surface-variant">Do zapisu potrzebujesz opłaconego pakietu.</p></div><ArrowRight size={17} className="shrink-0 text-primary-light" /></a>
    </section>
    <section id="packages" tabIndex={-1} aria-label="Pakiety zajęć grupowych" className="mt-10 min-w-0 scroll-mt-6 rounded-[var(--radius-xl)] border-t border-white/10 pt-8 focus:outline-2 focus:outline-primary-light/50 sm:mt-14">{packagesLoading ? <PublicLoading /> : packageError ? <PublicError message={packageError} retry={() => setRetry((value) => value + 1)} /> : <PackageList items={packages} layout="grid" />}</section>
  </>;
}
