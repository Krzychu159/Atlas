import type { Client, ClientSubscription } from "@/app/lib/owner/clients";

export default function ClientNotesPanel({
  client,
  subscription,
}: {
  client: Client;
  subscription: ClientSubscription | null;
}) {
  return (
    <aside className="card-shell p-5 md:p-6">
      <p className="text-section-title">Szybkie notatki</p>

      <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm leading-7 text-on-surface-variant">
        {client.notes || "Brak notatek dla tego klienta."}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <InfoRow
          label="Status subskrypcji"
          value={subscription?.status || client.status || "Brak danych"}
        />
        <InfoRow
          label="Zakończenie po cyklu"
          value={subscription?.cancelRenewalRequested ? "Tak" : "Nie"}
        />
        <InfoRow
          label="Auto-przedłużanie"
          value={subscription?.autoRenewEnabled ? "Włączone" : "Wyłączone"}
        />
      </div>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
