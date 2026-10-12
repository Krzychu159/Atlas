"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrganization } from "@/app/lib/super-admin/organizations";
import { useOrganizationResource } from "./use-organization-resource";
import { OrganizationError, OrganizationSkeleton } from "./organization-states";
import { OrganizationProfile } from "./organization-profile";
import { OrganizationForm } from "./organization-form";
import { OrganizationUsers } from "./organization-users";
import { Button } from "@/app/components/ui/button";

export function OrganizationDetails({ organizationId, created = false }: { organizationId: string; created?: boolean }) {
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<"general" | "users">("general");
  const [initialStaffRole, setInitialStaffRole] = useState<"" | "Owner">("");
  const [editing, setEditing] = useState(false);
  const load = useCallback((signal: AbortSignal) => getOrganization(organizationId, signal), [organizationId]);
  const { data, error, loading, retry, replace } = useOrganizationResource(`details:${organizationId}`, load);
  return (
    <div>
      <Link href="/super-admin/organizations" className="mb-6 inline-flex min-h-11 items-center gap-2 text-xs text-on-surface-variant hover:text-white"><ArrowLeft size={15} aria-hidden="true" />Wróć do organizacji</Link>
      <p className="font-[family-name:var(--font-super-admin-mono)] text-[11px] uppercase tracking-[0.16em] text-primary-light">Administracja platformy / Organizacje</p>
      <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{data?.name ?? "Szczegóły organizacji"}</h1>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">Dane organizacji i przypisana kadra.</p>
      <div className="mt-8">
        <nav aria-label="Widok organizacji" className="mb-6 flex flex-wrap gap-2 [&_button]:max-w-full [&_button]:whitespace-normal"><Button variant={section === "general" ? "primary" : "secondary"} aria-pressed={section === "general"} data-discard-changes={section !== "general" || undefined} onClick={() => setSection("general")}>Informacje ogólne</Button><Button variant={section === "users" ? "primary" : "secondary"} aria-pressed={section === "users"} data-discard-changes={section !== "users" || undefined} onClick={() => { setEditing(false); setSection("users"); }}>Użytkownicy i role</Button></nav>
        {notice && <p role="status" className="mb-6 rounded-xl bg-primary/10 p-4 text-sm leading-6 text-primary-light">{notice}</p>}
        {created && data?.status === "Draft" && data.crmAccessEnabled === false && <p role="status" className="mb-6 rounded-xl bg-primary/10 p-4 text-sm leading-6 text-primary-light">Organizacja jest szkicem i nie ma jeszcze dostępu do CRM.</p>}
        {loading ? <OrganizationSkeleton details /> : error ? <OrganizationError error={error} retry={retry} details returnPath={`/super-admin/organizations/${encodeURIComponent(organizationId)}`} /> : data ? (
          section === "users" ? <OrganizationUsers organization={data} initialRole={initialStaffRole} changed={message => { setNotice(message); setInitialStaffRole("Owner"); retry(); }} /> : editing ? <OrganizationForm key={`${data.organizationId}:${data.revision}`} organization={data} onSaved={saved => { setEditing(false); replace(saved); setNotice("Dane organizacji zostały zapisane."); }} onConflict={message => { setEditing(false); setNotice(message); retry(); }} onCancel={() => { setEditing(false); retry(); }} /> : <OrganizationProfile organization={data} onEdit={() => { setNotice(""); setEditing(true); }} />
        ) : null}
      </div>
    </div>
  );
}
