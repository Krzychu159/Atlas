import { OrganizationsList } from "../components/organizations-list";

export default function SuperAdminOrganizationsPage() {
  return (
    <div>
      <p className="font-[family-name:var(--font-super-admin-mono)] text-[11px] uppercase tracking-[0.16em] text-primary-light">Administracja platformy</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Organizacje</h1>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">Studia korzystające z platformy ATLAS.</p>
      <OrganizationsList />
    </div>
  );
}
