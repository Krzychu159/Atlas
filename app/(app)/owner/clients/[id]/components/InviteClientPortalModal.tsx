"use client";

import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { createInvitation } from "@/app/lib/owner/invitations";
import type { Client } from "@/app/lib/owner/clients";
import { showOwnerError, showOwnerSuccess } from "../../../components/owner-toast";

export default function InviteClientPortalModal({
  client,
  open,
  onClose,
  onInvited,
}: {
  client: Client;
  open: boolean;
  onClose: () => void;
  onInvited: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setEmail(client.email || "");
  }, [client.email, open]);

  if (!open) return null;

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      const invitation = await createInvitation({
        clientId: client.id,
        email: email.trim(),
        role: "Client",
      });

      if (invitation.lastSendError) {
        showOwnerError(new Error(invitation.lastSendError), "Nie udało się wysłać wiadomości e-mail.", {
          id: "owner-existing-client-invitation-send-error",
        });
        await onInvited();
        return;
      }

      showOwnerSuccess("Zaproszenie do panelu zostało wysłane.", {
        id: "owner-existing-client-invitation-success",
      });
      onClose();
      await onInvited();
    } catch (err) {
      showOwnerError(err, "Nie udało się wysłać zaproszenia.", {
        id: "owner-existing-client-invitation-error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="relative z-10 w-full max-w-[480px] rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="p-6">
          <ModalHeader
            eyebrow="Dostęp do panelu"
            title="Zaproś klienta"
            description="Zaproszenie zostanie powiązane z istniejącą kartoteką klienta."
            onClose={onClose}
          />
          <TextField
            label="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            required
            icon={<Mail size={17} />}
            className="mt-6"
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !email.trim()} icon={<Send size={16} />}>
            {isSubmitting ? "Wysyłanie..." : "Wyślij zaproszenie"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
