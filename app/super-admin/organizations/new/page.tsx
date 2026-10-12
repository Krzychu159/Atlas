"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrganizationForm } from "../../components/organization-form";

export default function NewOrganizationPage() {
  const router = useRouter();
  return <div className="max-w-4xl">
    <Link href="/super-admin/organizations" className="inline-flex min-h-11 items-center text-sm text-primary-light">Wróć do organizacji</Link>
    <p className="mt-6 font-[family-name:var(--font-super-admin-mono)] text-xs uppercase tracking-widest text-primary-light">Administracja platformy</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Nowa organizacja</h1>
    <div className="mt-8"><OrganizationForm onSaved={organization => router.replace(`/super-admin/organizations/${encodeURIComponent(organization.organizationId)}?created=1`)} /></div>
  </div>;
}
