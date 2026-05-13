import Link from "next/link";
import { ArrowLeft, Mail, Pencil, Phone, ShieldCheck } from "lucide-react";
import type { Client } from "@/app/lib/owner/clients";
import { getClientName } from "../../components/client-display";

function getInitials(client: Client) {
  return getClientName(client)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ClientProfileHero({
  client,
  onEdit,
}: {
  client: Client;
  onEdit: () => void;
}) {
  const fullName = getClientName(client);

  return (
    <section className="card-shell overflow-hidden p-5 md:p-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <Link
          href="/owner/clients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"
        >
          <ArrowLeft size={18} />
          Lista klientów
        </Link>
        <p className="text-label text-on-surface-muted">Karta klienta</p>
      </div>

      <div className="grid gap-7 lg:grid-cols-[190px_1fr_190px] lg:items-start">
        <div className="flex justify-center lg:justify-start">
          <div className="relative shrink-0">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[28px] bg-surface-container-lowest outline outline-4 outline-secondary">
              {client.avatarUrl ? (
                <img
                  src={client.avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[2.5rem] font-semibold text-primary-light">
                  {getInitials(client)}
                </span>
              )}
            </div>

            <div className="absolute -right-2 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-light text-on-tertiary shadow-soft">
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-label text-primary-light">
            {client.status || "Profil klienta"}
          </p>

          <h1 className="mt-3 font-display text-[2.7rem] font-semibold leading-[0.92] tracking-tight md:text-[4rem]">
            {fullName}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <Mail size={16} className="text-primary-light" />
              {client.email || "Brak e-maila"}
            </div>

            <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <Phone size={16} className="text-primary-light" />
              {client.phoneNumber || "Brak telefonu"}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-secondary/30 pt-6 md:grid-cols-3">
            <HeroStat
              label="Trener"
              value={client.trainerFullName || "Brak"}
            />
            <HeroStat label="Lokalizacja" value={client.locationName || "Brak"} />
            <HeroStat
              label="Utworzono"
              value={
                client.createdAt
                  ? new Date(client.createdAt).toLocaleDateString("pl-PL")
                  : "Brak"
              }
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-container"
        >
          <Pencil size={16} />
          Edytuj dane
        </button>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 min-h-8 text-lg font-semibold leading-tight text-on-surface">
        {value}
      </p>
    </div>
  );
}
