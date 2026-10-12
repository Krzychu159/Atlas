"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrganization } from "@/app/lib/super-admin/organizations";
import { useOrganizationResource } from "./use-organization-resource";
import { OrganizationError, OrganizationSkeleton } from "./organization-states";
import { OrganizationProfile } from "./organization-profile";

export function OrganizationDetails({ organizationId }: { organizationId: string }) {
  const load = useCallback((signal: AbortSignal) => getOrganization(organizationId, signal), [organizationId]);
  const { data, error, loading, retry } = useOrganizationResource(`details:${organizationId}`, load);
  return (
    <div>
      <Link href="/super-admin/organizations" className="mb-6 inline-flex min-h-11 items-center gap-2 text-xs text-on-surface-variant hover:text-white"><ArrowLeft size={15} aria-hidden="true" />Wróć do organizacji</Link>
      <p className="font-[family-name:var(--font-super-admin-mono)] text-[11px] uppercase tracking-[0.16em] text-primary-light">Administracja platformy / Organizacje</p>
      <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{data?.name ?? "Szczegóły organizacji"}</h1>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">Informacje o organizacji i jej obecnym wyglądzie.</p>
      <div className="mt-8">
        {loading ? <OrganizationSkeleton details /> : error ? <OrganizationError error={error} retry={retry} details returnPath={`/super-admin/organizations/${encodeURIComponent(organizationId)}`} /> : data ? (
          <OrganizationProfile organization={data} />
        ) : null}
      </div>
    </div>
  );
}
