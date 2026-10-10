import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

export default function SuperAdminPage() {
  return (
    <div>
      <p className="font-[family-name:var(--font-super-admin-mono)] text-[11px] uppercase tracking-[0.16em] text-primary-light">Administracja platformy</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Przegląd</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">Twoje miejsce do zarządzania platformą ATLAS.</p>

      <section aria-labelledby="organizations-heading" className="mt-9 max-w-3xl rounded-xl bg-[#1a1c1e] p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0052FF]/15 text-primary-light"><Building2 aria-hidden="true" size={23} /></div>
        <h2 id="organizations-heading" className="mt-6 text-xl font-semibold tracking-tight">Organizacje</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-on-surface-variant">Przeglądaj studia korzystające z ATLAS i sprawdzaj ich podstawowe informacje.</p>
        <Link href="/super-admin/organizations" className="mt-6 inline-flex min-h-11 items-center justify-center gap-3 rounded-lg bg-[#0052FF] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0046db] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-light">Przejdź do organizacji<ArrowRight aria-hidden="true" size={16} /></Link>
      </section>
    </div>
  );
}
