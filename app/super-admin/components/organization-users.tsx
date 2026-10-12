"use client";

import { useCallback, useState } from "react";
import type { Organization } from "@/app/lib/super-admin/organizations";
import { getOrganizationUsers, type StaffRole } from "@/app/lib/super-admin/organization-users";
import { useOrganizationResource } from "./use-organization-resource";
import { OwnerAssignment } from "./owner-assignment";
import { UsersError, UsersLoading, UsersPagination } from "./user-list-states";

const roleOptions = [{ value: "", label: "Wszyscy" }, { value: "Owner", label: "Właściciele" }, { value: "Trainer", label: "Trenerzy" }];

export function OrganizationUsers({ organization, initialRole = "", changed }: { organization: Organization; initialRole?: "" | StaffRole; changed: (message: string) => void }) {
  const [filter, setFilter] = useState(initialRole);
  const [page, setPage] = useState(1);
  const load = useCallback((signal: AbortSignal) => getOrganizationUsers(organization.organizationId, filter || undefined, page, signal), [organization.organizationId, filter, page]);
  const { data, error, loading, retry } = useOrganizationResource(`staff:${organization.organizationId}:${filter}:${page}`, load);
  return <section aria-labelledby="organization-users-heading" className="space-y-6 rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><h2 id="organization-users-heading" className="text-xl font-semibold">Użytkownicy i role</h2><p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">Właściciele i trenerzy przypisani do organizacji. Lista nie obejmuje klientów.</p></div><label className="w-full text-xs text-on-surface-variant sm:w-48">Filtr ról<select value={filter} onChange={event => { setFilter(event.target.value as "" | StaffRole); setPage(1); }} className="mt-2 h-12 w-full rounded-xl bg-[#121416] px-3 text-sm focus:outline-2 focus:outline-primary-light">{roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
    <p className="text-xs leading-6 text-on-surface-muted">Przypisanie do organizacji nie oznacza aktywnego dostępu do CRM. Szkic nie ma jeszcze takiego dostępu.</p>
    {loading ? <UsersLoading /> : error ? <UsersError error={error} retry={retry} /> : data ? <div>
      {!data.items.length ? <p role="status" className="rounded-xl bg-[#121416] p-5 text-sm text-on-surface-muted">{filter ? "Nie ma użytkowników z wybraną rolą na tej stronie." : "Nie ma użytkowników przypisanych do organizacji na tej stronie."}</p> : <div className="max-w-full overflow-x-auto rounded-xl bg-[#121416]"><table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Kadra organizacji {organization.name}, strona {page}</caption><thead className="text-xs text-on-surface-muted"><tr><th className="p-4" scope="col">Użytkownik</th><th className="p-4" scope="col">Role</th><th className="p-4" scope="col">Konto</th><th className="p-4" scope="col">Przypisanie</th></tr></thead><tbody>{data.items.map(user => <tr key={user.userId} className="border-t border-white/5"><th scope="row" className="max-w-72 break-words p-4 font-normal [overflow-wrap:anywhere]"><p className="break-words font-medium">{user.fullName || user.email}</p><p className="break-all text-xs text-on-surface-variant">{user.email}</p></th><td className="p-4">{user.roles.map(role => role === "Owner" ? "Właściciel" : "Trener").join(", ") || "Brak ról"}</td><td className="p-4">{user.accountStatus === "Active" ? "Aktywne" : "Nieaktywne"}</td><td className="p-4">{user.membershipStatus === "Legacy" ? "Dotychczasowe" : "Zarejestrowane"}</td></tr>)}</tbody></table></div>}
      <UsersPagination page={page} totalPages={data.totalPages} label="Strony kadry organizacji" change={setPage} />
    </div> : null}
    <div className="rounded-xl bg-[#121416] p-5"><OwnerAssignment key={`${organization.organizationId}:${organization.revision}`} organization={organization} changed={changed} /></div>
  </section>;
}
