"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import {
  updateClient,
  type Client,
  type ClientSubscription,
} from "@/app/lib/owner/clients";

export default function ClientNotesPanel({
  client,
  subscription,
  onClientChange,
}: {
  client: Client;
  subscription: ClientSubscription | null;
  onClientChange: (client: Client) => void;
}) {
  const [notes, setNotes] = useState(client.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(client.notes || "");
  }, [client.notes]);

  async function handleSaveNotes() {
    try {
      setIsSaving(true);
      const updatedClient = await updateClient(client.id, { notes });
      onClientChange(updatedClient);
      toast.success("Notatki klienta zostały zapisane.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nie udało się zapisać notatek.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="card-shell p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-section-title">Szybkie notatki</p>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSaveNotes}
          disabled={isSaving || notes === (client.notes || "")}
        >
          {isSaving ? "Zapis..." : "Zapisz"}
        </Button>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={6}
        placeholder="Dodaj notatkę o kliencie..."
        className="mt-5 w-full resize-none rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm leading-7 text-on-surface-variant outline-none placeholder:text-on-surface-muted"
      />

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
