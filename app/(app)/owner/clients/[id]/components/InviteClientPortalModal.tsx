"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import InvitationsList from "../../../components/InvitationsList";
import {
  cancelInvitation,
  createInvitation,
  getInvitations,
  isPendingInvitation,
  resendInvitation,
  type Invitation,
} from "@/app/lib/owner/invitations";
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
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const isInvited = client.portalAccessStatus === "Invited";

  const loadInvitations = useCallback(async () => {
    try {
      setIsLoadingInvitations(true);
      const data = await getInvitations({ role: "Client" });
      const clientEmail = (client.email || "").trim().toLowerCase();

      setInvitations(
        data.filter(
          (invitation) =>
            isPendingInvitation(invitation) &&
            (invitation.clientId === client.id ||
              (!invitation.clientId &&
                Boolean(clientEmail) &&
                invitation.email.trim().toLowerCase() === clientEmail)),
        ),
      );
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać zaproszenia.", {
        id: "owner-existing-client-invitation-load-error",
      });
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [client.email, client.id]);

  useEffect(() => {
    if (!open) return;

    setEmail(client.email || "");
    if (isInvited) void loadInvitations();
  }, [client.email, isInvited, loadInvitations, open]);

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

  async function handleResend(id: number) {
    try {
      setIsSubmitting(true);
      const invitation = await resendInvitation(id);
      await loadInvitations();

      if (invitation.lastSendError) {
        showOwnerError(
          new Error(invitation.lastSendError),
          "Nie udało się wysłać wiadomości e-mail.",
          { id: "owner-existing-client-invitation-resend-error" },
        );
        return;
      }

      showOwnerSuccess("Zaproszenie zostało ponowione.", {
        id: "owner-existing-client-invitation-resend-success",
      });
      await onInvited();
    } catch (err) {
      showOwnerError(err, "Nie udało się ponowić zaproszenia.", {
        id: "owner-existing-client-invitation-resend-error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    try {
      setIsSubmitting(true);
      await cancelInvitation(id);
      showOwnerSuccess("Zaproszenie zostało wycofane.", {
        id: "owner-existing-client-invitation-cancel-success",
      });
      onClose();
      await onInvited();
    } catch (err) {
      showOwnerError(err, "Nie udało się wycofać zaproszenia.", {
        id: "owner-existing-client-invitation-cancel-error",
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
            title={isInvited ? "Zaproszenie do panelu" : "Zaproś klienta"}
            description={
              isInvited
                ? "Ponów wysyłkę lub wycofaj oczekujące zaproszenie."
                : "Zaproszenie zostanie powiązane z istniejącą kartoteką klienta."
            }
            onClose={onClose}
          />
          {isInvited ? (
            <InvitationsList
              invitations={invitations}
              isLoading={isLoadingInvitations}
              onCancel={handleCancel}
              onResend={handleResend}
            />
          ) : (
            <TextField
              label="E-mail"
              value={email}
              onChange={setEmail}
              type="email"
              required
              icon={<Mail size={17} />}
              className="mt-6"
            />
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {isInvited ? "Zamknij" : "Anuluj"}
          </Button>
          {!isInvited ? (
            <Button onClick={handleSubmit} disabled={isSubmitting || !email.trim()} icon={<Send size={16} />}>
              {isSubmitting ? "Wysyłanie..." : "Wyślij zaproszenie"}
            </Button>
          ) : null}
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
