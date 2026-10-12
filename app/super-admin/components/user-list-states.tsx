import { Button } from "@/app/components/ui/button";
import { userManagementMessage } from "@/app/lib/super-admin/organization-users";

export function UsersLoading() {
  return <div role="status" aria-label="Wczytywanie użytkowników" className="space-y-3 rounded-xl bg-[#121416] p-5"><span className="sr-only">Wczytywanie użytkowników…</span>{[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="h-14 rounded-xl bg-white/5 motion-safe:animate-pulse" />)}</div>;
}
export function UsersError({ error, retry }: { error: unknown; retry: () => void }) {
  return <div role="alert" className="rounded-xl bg-[#121416] p-5"><p className="text-sm leading-6 text-on-surface-variant">{userManagementMessage(error)}</p><Button variant="secondary" className="mt-4" onClick={retry}>Spróbuj ponownie</Button></div>;
}
export function UsersPagination({ page, totalPages, change, label }: { page: number; totalPages: number; change: (page: number) => void; label: string }) {
  return <nav aria-label={label} className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-on-surface-muted">Strona {page}{totalPages > 0 ? ` z ${totalPages}` : ""}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => change(page - 1)}>Poprzednia</Button><Button variant="secondary" size="sm" disabled={page >= totalPages || page >= 100000} onClick={() => change(page + 1)}>Następna</Button></div></nav>;
}
