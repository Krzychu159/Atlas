"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { filterOrganizations, getOrganizations } from "@/app/lib/super-admin/organizations";
import { useOrganizationResource } from "./use-organization-resource";
import { OrganizationEmpty, OrganizationError, OrganizationSkeleton } from "./organization-states";

export function OrganizationsList() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const load = useCallback((signal: AbortSignal) => getOrganizations(page, signal), [page]);
  const { data, loading, error, retry } = useOrganizationResource(`list:${page}`, load);
  const items = data ? filterOrganizations(data.items, query) : [];
  const filtered = Boolean(query.trim());

  return (
    <div className="mt-8">
      <label htmlFor="organization-search" className="mb-2 block text-xs text-on-surface-variant">Szukaj na aktualnej stronie</label>
      <div className="max-w-lg"><Input id="organization-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nazwa, slug lub identyfikator organizacji" icon={<Search size={17} aria-hidden="true" />} aria-describedby="organization-search-note" /></div>
      <p id="organization-search-note" className="mb-6 mt-2 text-xs text-on-surface-muted">Wyszukiwanie obejmuje tylko organizacje z aktualnie pobranej strony.</p>

      {loading ? <OrganizationSkeleton /> : error ? <OrganizationError error={error} retry={retry} returnPath="/super-admin/organizations" /> : data ? (
        <>
          <p role="status" className="mb-4 text-xs text-on-surface-variant">{filtered ? `Pasujące organizacje na stronie: ${items.length} z ${data.items.length}` : `Organizacje na stronie: ${items.length}`} · Łącznie: {data.total}</p>
          {!items.length ? <OrganizationEmpty filtered={filtered && data.items.length > 0} page={page} clear={() => setQuery("")} /> : (
            <div className="overflow-x-auto rounded-xl bg-[#1a1c1e]">
              <table className="w-full min-w-[620px] text-left text-sm">
                <caption className="sr-only">Organizacje — strona {page}</caption>
                <thead className="bg-white/[0.025] text-xs text-on-surface-muted"><tr><th scope="col" className="px-5 py-4 font-medium">Organizacja</th><th scope="col" className="px-5 py-4 font-medium">Slug</th><th scope="col" className="px-5 py-4 font-medium">Wariant interfejsu</th><th scope="col" className="px-5 py-4 text-right font-medium">Szczegóły</th></tr></thead>
                <tbody>{items.map(organization => <tr key={organization.organizationId} className="border-t border-white/[0.035]"><th scope="row" className="px-5 py-5 font-normal"><p className="font-medium text-white">{organization.name}</p><p className="mt-1 max-w-56 break-all font-[family-name:var(--font-super-admin-mono)] text-[10px] text-on-surface-muted">{organization.organizationId}</p></th><td className="px-5 py-5 font-[family-name:var(--font-super-admin-mono)] text-xs text-on-surface-variant">{organization.slug}</td><td className="px-5 py-5 text-on-surface-variant">{organization.uiVariant}</td><td className="px-5 py-5 text-right"><Link href={`/super-admin/organizations/${encodeURIComponent(organization.organizationId)}`} aria-label={`Zobacz szczegóły organizacji ${organization.name}`} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-white/5 px-3 text-xs text-primary-light hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-primary-light">Zobacz szczegóły<ArrowRight size={14} aria-hidden="true" /></Link></td></tr>)}</tbody>
              </table>
            </div>
          )}
          <nav aria-label="Strony listy organizacji" className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-on-surface-muted">Strona {page}{data.totalPages > 0 ? ` z ${data.totalPages}` : ""}</p>
            <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="flex min-h-11 items-center gap-2 rounded-lg bg-white/5 px-3 text-xs text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" />Poprzednia</button><button type="button" disabled={page >= data.totalPages} onClick={() => setPage(value => value + 1)} className="flex min-h-11 items-center gap-2 rounded-lg bg-white/5 px-3 text-xs text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-40">Następna<ChevronRight size={15} aria-hidden="true" /></button></div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
