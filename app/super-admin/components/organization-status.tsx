import type { Organization } from "@/app/lib/super-admin/organizations";

export function OrganizationStatus({ organization }: { organization: Organization }) {
  return <div className="space-y-2">
    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${organization.status === "Draft" ? "bg-primary/15 text-primary-light" : "bg-white/5 text-on-surface-variant"}`}>
      {organization.status === "Draft" ? "Szkic" : organization.status === "Active" || organization.status === "LegacyActive" ? "Aktywna" : "Status niedostępny"}
    </span>
    <p className="text-xs text-on-surface-muted">{organization.accessMode === "SetupOnly" ? "Dostęp tylko do konfiguracji" : organization.accessMode === "Unavailable" ? "Brak aktywnego dostępu do CRM" : organization.accessMode === "CoreCrm" || organization.accessMode === "FullCrm" || organization.crmAccessEnabled === true ? "Dostęp do CRM aktywny" : organization.crmAccessEnabled === false ? "Brak aktywnego dostępu do CRM" : "Informacja o dostępie do CRM niedostępna"}</p>
  </div>;
}
