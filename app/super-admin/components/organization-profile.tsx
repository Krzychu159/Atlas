import type { Organization } from "@/app/lib/super-admin/organizations";
import { OrganizationStatus } from "./organization-status";
import { Button } from "@/app/components/ui/button";
import { CopyOrganizationId } from "./copy-organization-id";

export function OrganizationProfile({ organization, onEdit }: { organization: Organization; onEdit?: () => void }) {
  return <section aria-labelledby="organization-information-heading" className="rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><h2 id="organization-information-heading" className="text-xl font-semibold tracking-tight">Dane organizacji</h2><div className="flex flex-wrap items-start gap-4"><OrganizationStatus organization={organization} />{onEdit && <Button type="button" variant="secondary" onClick={onEdit}>Edytuj</Button>}</div></div>
    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
      {[["Nazwa", organization.name], ["Kod organizacji", organization.slug], ["Identyfikator organizacji", organization.organizationId], ["Wariant interfejsu", organization.uiVariant === "default" ? "Domyślny" : organization.uiVariant === "bsworkout" ? "BSworkout" : organization.uiVariant]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-[#121416] p-4"><dt className="text-xs text-on-surface-variant">{label}</dt><dd className="mt-2 break-words text-sm leading-6 [overflow-wrap:anywhere]">{value}{label === "Identyfikator organizacji" && <CopyOrganizationId organizationId={organization.organizationId} />}</dd></div>)}
    </dl>
  </section>;
}
