"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { updateClient, type Client } from "@/app/lib/owner/clients";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../../../components/owner-toast";

export default function ClientNotesPanel({
  client,
  onClientChange,
}: {
  client: Client;
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
      showOwnerSuccess("Notatki klienta zostały zapisane.", {
        id: "owner-client-notes-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się zapisać notatek.", {
        id: "owner-client-notes-error",
      });
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

      <PaymentHistoryMock />
    </aside>
  );
}

const mockPayments = [
  {
    title: "Pakiet 8 treningów 1:1",
    date: "12 maj 2026",
    amount: "+350 zł",
  },
  {
    title: "Doładowanie salda",
    date: "28 kwi 2026",
    amount: "+120 zł",
  },
];

function PaymentHistoryMock() {
  return (
    <section className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-section-title">Historia wpłat</p>
          <p className="mt-1 text-xs text-on-surface-muted">
            Miejsce pod dane z rozliczeń klienta.
          </p>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-light">
          Mock
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {mockPayments.map((payment) => (
          <div
            key={`${payment.title}-${payment.date}`}
            className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-on-surface">
                {payment.title}
              </p>
              <p className="shrink-0 text-sm font-semibold text-tertiary-light">
                {payment.amount}
              </p>
            </div>
            <p className="mt-1 text-xs text-on-surface-muted">{payment.date}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
