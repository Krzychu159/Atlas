"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/app/components/ui/button";
import { TextField, TextArea, FormField } from "@/app/components/ui/input";
import { ApiError } from "@/app/lib/backend";
import Link from "next/link";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { createOrganization, updateOrganization, validateOrganizationForm, organizationMutationMessage, type Organization, type ManagedOrganization, type OrganizationFormValues } from "@/app/lib/super-admin/organizations";

export function OrganizationForm({ organization, onSaved, onConflict }: {
  organization?: Organization;
  onSaved: (organization: ManagedOrganization) => void;
  onConflict?: (message: string) => void;
}) {
  const [values, setValues] = useState<OrganizationFormValues>(() => ({ name: organization?.name ?? "", slug: organization?.slug ?? "", uiVariant: organization?.uiVariant ?? "default", reason: "" }));
  const [errors, setErrors] = useState<Partial<Record<keyof OrganizationFormValues, string>>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const dirty = values.name !== (organization?.name ?? "") || values.slug !== (organization?.slug ?? "") || values.uiVariant !== (organization?.uiVariant ?? "default") || Boolean(values.reason);
  useUnsavedChanges(dirty && !blocked, busy);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const editable = !organization || (organization.revision !== undefined && organization.status !== undefined && organization.crmAccessEnabled !== undefined);
  const change = (field: keyof OrganizationFormValues, value: string) => setValues(current => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !editable || blocked) return;
    const invalid = validateOrganizationForm(values);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      const field = Object.keys(invalid)[0];
      event.currentTarget.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const saved = organization
        ? await updateOrganization(organization.organizationId, organization.revision!, values)
        : await createOrganization(values);
      if (!mounted.current) return;
      setBlocked(true);
      onSaved(saved);
    } catch (error) {
      if (!mounted.current) return;
      const explanation = organizationMutationMessage(error);
      setMessage(explanation);
      if (error instanceof ApiError && error.status === 409 && organization) {
        setBlocked(true);
        onConflict?.(explanation);
      } else if (!(error instanceof ApiError) || ![400, 409].includes(error.status)) {
        // An uncertain result must be reviewed before another mutation.
        setBlocked(true);
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <form onSubmit={submit} noValidate className="rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
    <h2 className="text-xl font-semibold">{organization ? "Edytuj dane organizacji" : "Dane nowej organizacji"}</h2>
    {!organization && <p className="mt-3 text-sm leading-6 text-on-surface-variant">Nowa organizacja będzie szkicem bez aktywnego dostępu do CRM. Nie przypiszemy jej jeszcze właściciela.</p>}
    {!editable && <p role="status" className="mt-4 text-sm text-on-surface-variant">Edycja będzie dostępna po udostępnieniu aktualnej wersji danych organizacji.</p>}
    {message && <p role="alert" className="mt-4 text-sm leading-6 text-error-light">{message}{blocked && " Wróć do listy, sprawdź aktualne dane i ponownie otwórz formularz."}</p>}
    <p className="mt-3 text-xs text-on-surface-muted">Wszystkie pola są wymagane.</p>
    {Object.keys(errors).length > 0 && <p role="alert" className="mt-3 text-sm text-error-light">Sprawdź zaznaczone pola.</p>}
    <fieldset disabled={busy || !editable || blocked} className="mt-6 grid gap-5 sm:grid-cols-2">
      <div><TextField label="Nazwa organizacji" name="name" value={values.name} onChange={value => change("name", value)} maxLength={100} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "organization-name-error" : undefined} />{errors.name && <p id="organization-name-error" className="mt-2 text-xs text-error-light">{errors.name}</p>}</div>
      <div><TextField label="Kod organizacji" name="slug" value={values.slug} onChange={value => change("slug", value)} maxLength={100} required aria-invalid={Boolean(errors.slug)} aria-describedby="organization-slug-note" /><p id="organization-slug-note" className={`mt-2 text-xs ${errors.slug ? "text-error-light" : "text-on-surface-muted"}`}>{errors.slug ?? "Małe litery, cyfry i pojedyncze myślniki, np. atlas-demo."}</p></div>
      <FormField label="Wariant interfejsu"><select name="uiVariant" required value={values.uiVariant} onChange={event => change("uiVariant", event.target.value)} aria-invalid={Boolean(errors.uiVariant)} aria-describedby={errors.uiVariant ? "organization-variant-error" : undefined} className="mt-2 h-12 w-full rounded-xl bg-[#121416] px-4 text-sm focus:outline-2 focus:outline-primary-light"><option value="default">Domyślny</option><option value="bsworkout">BSworkout</option>{!["default", "bsworkout"].includes(values.uiVariant) && <option value={values.uiVariant}>Obecny: {values.uiVariant}</option>}</select>{errors.uiVariant && <p id="organization-variant-error" className="mt-2 text-xs text-error-light">{errors.uiVariant}</p>}</FormField>
      <div className="sm:col-span-2"><TextArea label={organization ? "Powód zmiany" : "Powód utworzenia"} name="reason" value={values.reason} onChange={value => change("reason", value)} maxLength={1000} required aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? "organization-reason-error" : undefined} />{errors.reason && <p id="organization-reason-error" className="mt-2 text-xs text-error-light">{errors.reason}</p>}</div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Button type="submit" disabled={busy || !editable || blocked}>{busy ? "Zapisywanie…" : organization ? "Zapisz zmiany" : "Utwórz organizację"}</Button><Link href="/super-admin/organizations" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm text-on-surface-variant hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-primary-light">Anuluj</Link></div>
    </fieldset>
  </form>;
}
