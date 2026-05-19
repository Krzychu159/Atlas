"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { updateClient, type Client } from "@/app/lib/owner/clients";
import {
  getPaymentStatusLabel,
  type ClientPayment,
} from "@/app/lib/owner/billing";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../../../components/owner-toast";

export default function ClientNotesPanel({
  client,
  payments,
  onClientChange,
}: {
  client: Client;
  payments: ClientPayment[];
  onClientChange: (client: Client) => void;
}) {
  const [draft, setDraft] = useState({
    clientId: client.id,
    notes: client.notes || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const notes = draft.clientId === client.id ? draft.notes : client.notes || "";

  async function handleSaveNotes() {
    console.log("handleSaveNotes start", {
      clientId: client.id,
      notes,
    });

    try {
      setIsSaving(true);
      const updatedClient = await updateClient(client.id, {
        trainerId: client.trainerId ?? 0,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phoneNumber: client.phoneNumber || "",
        avatarUrl: client.avatarUrl || "",
        goal: client.goal || "",
        notes,
        progressPercent: client.progressPercent ?? 0,
        billingStatus: client.billingStatus || "",
        status: client.status || "active",
        nextSessionAt: client.nextSessionAt || null,
        locationId: client.locationId ?? 0,
      });
      onClientChange(updatedClient);
      showOwnerSuccess("Notatki klienta zostały zapisane.", {
        id: "owner-client-notes-success",
      });
      console.log("Updated client:", updatedClient);
    } catch (err) {
      console.error("handleSaveNotes error", err);
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
        onChange={(event) =>
          setDraft({ clientId: client.id, notes: event.target.value })
        }
        rows={4}
        placeholder="Dodaj notatkę o kliencie..."
        className="mt-5 w-full resize-none rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm leading-7 text-on-surface-variant outline-none placeholder:text-on-surface-muted"
      />

      <PaymentHistory payments={payments} />
    </aside>
  );
}

function PaymentHistory({ payments }: { payments: ClientPayment[] }) {
  return (
    <section className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-section-title">Ostatnie wpłaty</p>
          <p className="mt-1 text-xs text-on-surface-muted">
            Trzy najnowsze operacje płatnicze klienta.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {payments.length > 0 ? (
          payments.slice(0, 3).map((payment) => (
            <div
              key={payment.id}
              className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-on-surface">
                  {payment.packageName || "Wpłata klienta"}
                </p>
                <p className="shrink-0 text-sm font-semibold text-tertiary-light">
                  {formatMoney(payment.amount, payment.currency)}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-on-surface-muted">
                <span>{formatDate(payment.paymentDate)}</span>
                <span>{getPaymentStatusLabel(payment.status)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-4 text-center text-sm text-on-surface-variant">
            Brak wpłat do wyświetlenia.
          </div>
        )}
      </div>
    </section>
  );
}

function formatMoney(amount: number, currency?: string | null) {
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Brak daty";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
