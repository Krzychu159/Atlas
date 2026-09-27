import { CheckCircle2, FileCheck2 } from "lucide-react";
import type { ClientLegalConsent } from "@/app/lib/owner/clients";

export default function ClientLegalConsentsPanel({
  consents,
}: {
  consents: ClientLegalConsent[];
}) {
  return (
    <section className="card-shell p-5 md:p-6" aria-labelledby="legal-consents-title">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
          <FileCheck2 size={19} />
        </span>
        <div>
          <h2 id="legal-consents-title" className="font-display text-lg font-semibold">
            Historia zgód
          </h2>
          <p className="mt-1 text-xs text-on-surface-muted">
            Regulaminy zaakceptowane przez klienta.
          </p>
        </div>
      </div>

      {consents.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-on-surface-muted">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Firma</th>
                <th className="pb-3 pr-4 font-semibold">Wersja</th>
                <th className="pb-3 pr-4 font-semibold">Data</th>
                <th className="pb-3 pr-4 font-semibold">Źródło</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {consents.map((consent, index) => (
                <tr key={`${consent.legalEntityName}-${consent.documentVersion}-${consent.acceptedAt}-${index}`}>
                  <td className="py-3 pr-4 font-semibold text-on-surface">{consent.legalEntityName}</td>
                  <td className="py-3 pr-4 text-on-surface-variant">{consent.documentVersion}</td>
                  <td className="py-3 pr-4 text-on-surface-variant">{formatConsentDate(consent.acceptedAt)}</td>
                  <td className="py-3 pr-4 text-on-surface-variant">{consent.source}</td>
                  <td className="py-3">
                    {consent.isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary/15 px-2.5 py-1 text-xs font-semibold text-tertiary-light">
                        <CheckCircle2 size={13} /> Aktualna
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-muted">Historyczna</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-low p-4 text-sm text-on-surface-muted">
          Brak zapisanych zgód klienta.
        </p>
      )}
    </section>
  );
}

function formatConsentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
