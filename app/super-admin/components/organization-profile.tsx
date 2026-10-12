import type { Organization } from "@/app/lib/super-admin/organizations";
import { OrganizationStatus } from "./organization-status";

export function OrganizationProfile({ organization }: { organization: Organization }) {
  return <section aria-labelledby="organization-information-heading" className="rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><h2 id="organization-information-heading" className="text-xl font-semibold tracking-tight">Dane organizacji</h2><OrganizationStatus organization={organization} /></div>
    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
      {[["Nazwa", organization.name], ["Kod organizacji", organization.slug], ["Identyfikator organizacji", organization.organizationId], ["Wariant interfejsu", organization.uiVariant === "default" ? "Domyślny" : organization.uiVariant === "bsworkout" ? "BSworkout" : organization.uiVariant]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-[#121416] p-4"><dt className="text-xs text-on-surface-variant">{label}</dt><dd className="mt-2 break-words text-sm leading-6 [overflow-wrap:anywhere]">{value}</dd></div>)}
    </dl>
    <div className="mt-6 flex flex-wrap gap-2" aria-label="Planowane funkcje">{["Wygląd", "Lokalizacje", "Integracje", "Ustawienia organizacji"].map(title => <span key={title} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-on-surface-variant">{title} <span className="text-on-surface-muted">· Wkrótce</span></span>)}</div>
  </section>;
}
