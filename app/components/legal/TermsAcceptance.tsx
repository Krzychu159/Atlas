"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";

type TermsAcceptanceProps = {
  companyName: string;
  termsVersion: string;
  termsUrl: string;
  isAccepted?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
};

export default function TermsAcceptance({
  companyName,
  termsVersion,
  termsUrl,
  isAccepted = false,
  checked = false,
  onCheckedChange,
  disabled = false,
  id = "terms-acceptance",
}: TermsAcceptanceProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-muted">
            Regulamin firmy
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-on-surface">
            {companyName}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary-light">
          wersja {termsVersion}
        </span>
      </div>

      <a
        href={termsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-light hover:text-on-surface"
      >
        Otwórz regulamin
        <ExternalLink size={15} />
      </a>

      {isAccepted ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-tertiary-light">
          <CheckCircle2 size={17} />
          Ta wersja regulaminu jest już zaakceptowana.
        </p>
      ) : (
        <label htmlFor={id} className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-on-surface-variant">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange?.(event.target.checked)}
            disabled={disabled}
            className="mt-1 h-5 w-5 shrink-0 rounded border border-white/10 bg-surface-container-lowest"
          />
          <span>
            Zapoznałem/am się z regulaminem firmy {companyName} w wersji {termsVersion} i akceptuję jego treść.
          </span>
        </label>
      )}
    </section>
  );
}
