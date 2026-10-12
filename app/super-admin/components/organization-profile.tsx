import { Building2, Palette } from "lucide-react";
import type { Organization } from "@/app/lib/super-admin/organizations";

const upcomingSections = ["Użytkownicy i role", "Lokalizacje", "Integracje", "Ustawienia organizacji"];
const brandingSections = [
  ["Identyfikacja wizualna", "Miejsce na logo i ikonę organizacji."],
  ["Kolory", "Miejsce na kolory używane w interfejsie organizacji."],
  ["Ekran logowania", "Miejsce na treści powitalne i wygląd ekranu logowania."],
];

export function OrganizationProfile({ organization }: { organization: Organization }) {
  return (
    <div className="space-y-6">
      <nav aria-label="Sekcje organizacji" className="flex flex-wrap gap-2">
        <a href="#organization-information" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0052FF] px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"><Building2 size={16} aria-hidden="true" />Informacje ogólne</a>
        <a href="#organization-branding" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1a1c1e] px-4 text-sm text-on-surface-variant hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"><Palette size={16} aria-hidden="true" />Branding</a>
      </nav>

      <section id="organization-information" aria-labelledby="organization-information-heading" className="scroll-mt-24 rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
        <p className="font-[family-name:var(--font-super-admin-mono)] text-[11px] uppercase tracking-[0.16em] text-primary-light">Organizacja</p>
        <h2 id="organization-information-heading" className="mt-2 text-xl font-semibold tracking-tight">Informacje ogólne</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[["Nazwa", organization.name], ["Slug", organization.slug], ["Identyfikator organizacji", organization.organizationId], ["Wariant interfejsu", organization.uiVariant]].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-xl bg-[#121416] p-4">
              <dt className="text-xs text-on-surface-muted">{label}</dt>
              <dd className={`mt-3 break-words text-sm leading-6 text-white ${label === "Nazwa" ? "font-medium" : "font-[family-name:var(--font-super-admin-mono)] [overflow-wrap:anywhere]"}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="organization-branding" aria-labelledby="organization-branding-heading" className="scroll-mt-24 rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="organization-branding-heading" className="text-xl font-semibold tracking-tight">Branding</h2>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-on-surface-variant">Edycja wkrótce</span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">Tutaj dostosujesz wygląd organizacji. Edycja i publikowanie zmian nie są jeszcze dostępne.</p>
        <p className="mt-4 text-xs leading-6 text-on-surface-muted">Obecny wariant interfejsu: <span className="break-all font-[family-name:var(--font-super-admin-mono)] text-primary-light">{organization.uiVariant}</span></p>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {brandingSections.map(([title, description]) => (
            <div key={title} className="rounded-xl bg-[#121416] p-5">
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {upcomingSections.map(title => (
          <section key={title} aria-label={`${title} — Wkrótce`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#1a1c1e] p-5">
            <h2 className="text-sm font-medium text-on-surface-variant">{title}</h2>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-on-surface-muted">Wkrótce</span>
          </section>
        ))}
      </div>
    </div>
  );
}
