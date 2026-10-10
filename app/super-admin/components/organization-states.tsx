"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { ApiError, getErrorMessage } from "@/app/lib/backend";

export function OrganizationSkeleton({ details = false }: { details?: boolean }) {
  return (
    <div role="status" aria-label={details ? "Wczytywanie szczegółów organizacji" : "Wczytywanie organizacji"} className="rounded-xl bg-[#1a1c1e] p-6">
      <span className="sr-only">Wczytywanie…</span>
      <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
        {Array.from({ length: details ? 4 : 5 }, (_, index) => <div key={index} className="flex items-center gap-4"><div className="h-10 w-10 rounded-lg bg-white/5" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 max-w-64 rounded bg-white/5" /><div className="h-3 w-1/3 max-w-40 rounded bg-white/5" /></div></div>)}
      </div>
    </div>
  );
}

export function OrganizationError({ error, retry, details = false, returnPath }: { error: unknown; retry: () => void; details?: boolean; returnPath: string }) {
  const status = error instanceof ApiError ? error.status : null;
  const title = status === 401 ? "Zaloguj się ponownie"
    : status === 403 ? "Nie masz dostępu do organizacji"
    : status === 404 ? details ? "Nie znaleziono organizacji" : "Lista organizacji jest niedostępna"
    : "Nie udało się wczytać organizacji";
  const description = status === 401 ? "Twoja sesja wygasła. Zaloguj się, aby kontynuować."
    : status === 403 ? "Przeglądanie organizacji wymaga uprawnień SuperAdmina."
    : status === 404 ? details ? "Ta organizacja nie jest dostępna. Wróć do listy i wybierz inną." : "Nie możemy teraz wyświetlić listy organizacji. Spróbuj ponownie później."
    : getErrorMessage(error, "Nie udało się pobrać danych. Spróbuj ponownie za chwilę.");
  return (
    <section role="alert" className="rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
      <h2 className="text-lg font-semibold">{title}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-on-surface-variant">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {status === 401 ? <Link href={`/logout?reason=session-expired&next=${encodeURIComponent(returnPath)}`} className="rounded-lg bg-[#0052FF] px-4 py-3 text-sm font-medium text-white">Przejdź do logowania</Link>
          : status !== 403 && !(details && status === 404) ? <button type="button" onClick={retry} className="min-h-11 rounded-lg bg-[#0052FF] px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-light">Spróbuj ponownie</button> : null}
        {details ? <Link href="/super-admin/organizations" className="rounded-lg bg-white/5 px-4 py-3 text-sm text-on-surface-variant">Wróć do organizacji</Link> : null}
      </div>
    </section>
  );
}

export function OrganizationEmpty({ filtered, page, clear }: { filtered: boolean; page: number; clear: () => void }) {
  return (
    <div role="status" className="rounded-xl bg-[#1a1c1e] px-6 py-12 text-center">
      <Building2 aria-hidden="true" className="mx-auto h-8 w-8 text-primary-light" />
      <h2 className="mt-5 text-lg font-semibold">{filtered ? "Brak pasujących organizacji na tej stronie" : page > 1 ? "Na tej stronie nie ma organizacji" : "Nie ma jeszcze organizacji"}</h2>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{filtered ? "Zmień szukaną frazę lub sprawdź inną stronę listy." : page > 1 ? "Wróć na poprzednią stronę listy." : "Organizacje pojawią się tutaj, gdy zostaną dodane."}</p>
      {filtered ? <button type="button" onClick={clear} className="mt-5 min-h-11 rounded-lg bg-white/5 px-4 text-sm text-primary-light">Wyczyść wyszukiwanie</button> : null}
    </div>
  );
}
